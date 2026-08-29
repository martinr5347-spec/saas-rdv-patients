# Changelog technique

> **À quoi sert ce fichier** : c'est la mémoire de Claude sur ce projet. Colle son chemin
> (`c:\Users\marti\Desktop\SAAS\saas-rdv-patients\CHANGELOG.md`) en début de conversation
> pour que Claude se remette à jour sur tout ce qui a déjà été fait, testé et corrigé —
> au lieu de redécouvrir ou de refaire un travail déjà réalisé.
>
> Voir aussi [`TODO.md`](./TODO.md) pour l'état d'avancement actuel et ce qu'il reste à faire.

---

## 2026-08-19

### Récupération et mise en place du projet
- Clonage du repo GitHub `saas-rdv-patients` dans `c:\Users\marti\Desktop\SAAS\saas-rdv-patients`
- Installation de Node.js LTS (24.19.0) + npm via winget (absent de la machine)
- `npm install` — dépendances installées
- Création de `.env.local` avec les identifiants Supabase (URL, clé publishable, clé secrète)
- Application des migrations `001_initial_schema.sql` et `002_seed_templates.sql`
- **Bug corrigé** : `002_seed_templates.sql` référençait une colonne `updated_at` inexistante sur `message_templates` (clause `ON CONFLICT ... DO UPDATE SET updated_at = now()`) — colonne retirée de la clause

### Audit et finalisation Phase 0 (fondations)
- Revue complète du code d'auth, middleware, inscription, Stripe
- **Bug corrigé** : `middleware.ts` contenait une constante `WEBHOOK_AND_CRON_PREFIXES` déclarée mais jamais utilisée (code mort trompeur) — supprimée
- **Bug corrigé** : `app/api/auth/register/route.ts` ne gérait pas les erreurs partielles lors de la création `users`/`org_settings`/`subscriptions` — un compte Supabase Auth pouvait rester orphelin en cas d'échec, bloquant toute nouvelle tentative avec le même email. Ajout d'un rollback (suppression org + suppression user Auth) si l'initialisation échoue.
- Validation : `tsc --noEmit`, `next lint`, `next build` tous propres

### Tests réels inscription/connexion/Stripe
- **Bug bloquant trouvé et corrigé** : le rôle `service_role` n'avait aucune permission sur les tables (créées via connexion Postgres directe, donc les GRANT automatiques Supabase n'avaient jamais été posés) → `permission denied for table organizations`. Migration `003_grants.sql` ajoutée (GRANT sur toutes les tables pour `anon`/`authenticated`/`service_role` + `ALTER DEFAULT PRIVILEGES`)
- Tests via API réelle (cookies de session) : inscription, rollback automatique validé, connexion, mauvais mot de passe rejeté, doublon d'email rejeté proprement, isolation RLS entre deux cabinets confirmée

### Mise en place Stripe (mode test)
- Création des plans "Fondateur" (49,99€/mois) et "Standard" (69,99€/mois) via l'API Stripe → `STRIPE_PRICE_FONDATEUR`, `STRIPE_PRICE_STANDARD`
- Installation du Stripe CLI (winget) pour `stripe listen` (webhooks en local)
- ⚠️ Le Stripe CLI affiche un tag `<claude-code-hint .../>` suggérant un plugin — vérifié comme fonctionnalité officielle du CLI (section "Agent guidance" dans son `--help`), pas une injection malveillante. Rien installé sans validation.
- **Bug corrigé** : `create-checkout/route.ts` faisait un `upsert()` sur `subscriptions` sans cible de conflit (pas de contrainte unique sur `organization_id`) → créait une ligne dupliquée à chaque tentative de paiement. Migration `004_subscriptions_unique_org.sql` (contrainte unique) + correction de l'upsert (`onConflict: 'organization_id'`)
- Test de bout en bout réussi : inscription → blocage dashboard → Stripe Checkout réel → webhook signé → abonnement activé → dashboard débloqué

### Flow d'inscription : essai gratuit + paiement (évolutions demandées)
- Retrait temporaire du paiement obligatoire à l'inscription (test), puis réintégration propre : inscription = compte + connexion auto (sans plan), `/subscribe` affiche ensuite le choix
- **Migration `005_trial.sql`** : ajout colonne `trial_ends_at`, ajout `'trial'` au check constraint de `subscriptions.statut`
- Nouvelle route `POST /api/subscription/trial` : active un essai 7 jours sans carte (`statut = 'trial'`, `trial_ends_at = now() + 7j`)
- `/register` : formulaire simplifié (nom, email, mot de passe — plus de sélecteur de plan)
- `/subscribe` : deux cartes distinctes — "Essai gratuit 7 jours" vs "Fondateur — 49,99€/mois" (Stripe Checkout)
- `middleware.ts` : bloque le dashboard si essai expiré (`statut='trial'` et `trial_ends_at` dépassé) → redirection `/subscribe?expired=1` avec message
- `app/dashboard/layout.tsx` : bannière "Essai gratuit : X jours restants" + lien "Passer au plan payant"
- Testé en réel : inscription → essai activé → dashboard accessible avec bannière → expiration simulée → redirection correcte

### Audit complet Phase 1 (MVP email — F2 à F10)
Revue de tout le code déjà présent (webhook Calendly, dispatcher, webhook MercadoPago, crons F6/F7/F8, dashboard RDV, settings). **5 bugs trouvés et corrigés :**
1. 🔴 **Critique** — Signature webhook Calendly : mauvais header (`x-calendly-signature`) et mauvais format (HMAC brut au lieu du schéma `t=...,v1=...` réellement utilisé par Calendly, comme Stripe) → aurait toujours échoué en prod
2. 🟠 Crons F7 (aviso) / F8 (recordatorio) : pré-check bloquait la relance d'un canal en échec si un autre canal avait déjà réussi (le dispatcher gère déjà l'idempotence par canal) — pré-check redondant supprimé
3. 🟡 Montant MercadoPago incorrect : juste loggé, pas d'alerte admin (requis par le spec F12) — alerte ajoutée
4. 🟠 Erreurs internes des webhooks (tenant introuvable, patient non créé, RDV introuvable...) renvoyaient 404/400/500 au lieu de 200 → risque de tempête de retry côté Calendly/MercadoPago — toutes renvoient maintenant 200 + log + alerte admin
5. 🟢 `lib/utils/idempotency.ts` : code mort (jamais utilisé) — supprimé

Tests réels effectués (webhooks signés) : webhook Calendly (création RDV, idempotence, signature invalide rejetée), dispatcher (échec email géré proprement), webhook MercadoPago (paiement, idempotence, montant incorrect détecté), cron F6 (annulation auto validée), cron sans secret rejeté.

### MercadoPago — token de test réel
- `MP_ACCESS_TOKEN_TEST` configuré
- **Bug corrigé** : `createPaymentLink` envoyait toujours `auto_return: 'approved'`, rejeté par l'API MercadoPago quand `back_urls.success` n'est pas une URL https publique (le cas en local avec `localhost`) → **aucun lien de paiement n'était jamais généré**. Corrigé : `auto_return` seulement si l'URL est une vraie URL https publique.
- Testé en réel : lien de paiement MercadoPago valide généré via webhook Calendly

### Unipile — mise à jour API v2
- Recherche documentation officielle (`developer.unipile.com`)
- `lib/dispatcher/channels/whatsapp.ts` mis à jour : endpoint `/v2/{account_id}/chats/start` (account_id dans l'URL, plus dans le body), champ `attendees_ids` → `users_ids`
- **Bug corrigé au passage** (présent même en v1) : le numéro de téléphone n'était jamais formaté au format WhatsApp attendu (`{numero}@s.whatsapp.net`) — corrigé
- ⚠️ Non testé en réel (pas de clé Unipile à ce stade) — la doc officielle elle-même est incohérente entre deux pages sur le nom exact de l'endpoint (`/chats/send` vs `/chats/start`)

### CRON_SECRET
- Généré aléatoirement (32 bytes hex) et configuré
- Testé : les 3 crons (F6/F7/F8) acceptent le secret et rejettent les requêtes non authentifiées (401)

### Migration Amazon SES → Resend
- `npm install resend`, `npm uninstall nodemailer @types/nodemailer`
- `lib/dispatcher/channels/email.ts` réécrit avec la même interface exportée (`sendEmail(to, subject, html)`) — aucun autre fichier à modifier
- `.env.example` régénéré à jour
- `RESEND_API_KEY` configurée, testée en réel (email direct + flow complet Calendly → Dispatcher → Resend, notification `statut: 'sent'`)
- Restriction connue du domaine de test `onboarding@resend.dev` : ne peut envoyer qu'à l'adresse du compte Resend (`martinr5347@gmail.com`) tant qu'aucun domaine n'est vérifié

### Système de chauffe des numéros WhatsApp (Unipile)
- Palier retenu : "prudent" — J1-3: 5msg/j, J4-7: 10/j, J8-14: 20/j, J15-21: 40/j, J22+: 80/j (plafond) + délai minimum 15s entre deux messages
- **Migration `006_whatsapp_warming.sql`** : ajout colonne `org_settings.unipile_connected_at`
- `lib/dispatcher/warming.ts` créé : barème de chauffe (`getDailyLimit`), gestion de la date de connexion (`resolveUnipileConnectedAt` — reset si le numéro change, effacé si déconnecté)
- `lib/dispatcher/index.ts` : vérification quota + délai avant tout envoi WhatsApp ; si bloqué → notification `failed` avec raison explicite, sans alerter l'admin (comportement normal, pas une erreur)
- `app/api/settings/route.ts` et `app/dashboard/settings/page.tsx` : gèrent automatiquement `unipile_connected_at` à la sauvegarde des settings
- Testé en réel : quota atteint → bloqué avant l'appel Unipile ; délai trop court → bloqué ; quota disponible → passe (échoue ensuite pour une autre raison faute de vraie clé Unipile, ce qui prouve que le filtre de chauffe n'était pas le blocage)
- **Bug critique trouvé et corrigé en testant** : le matching tenant du webhook Calendly (`matchCalendlyUrl`) pouvait faire correspondre **n'importe quel cabinet à n'importe quel autre** à cause d'une comparaison avec une chaîne vide (`"n'importe quoi".includes("")` vaut toujours `true` en JS) quand `event_type.url` est absent du payload — un RDV (et son paiement) pouvait atterrir sur le mauvais cabinet. Corrigé : les candidats vides sont désormais filtrés avant comparaison. Re-testé avec deux cabinets actifs simultanément pour confirmer l'isolation.

---

## 2026-08-20

### Documentation de mémoire technique
- Création de `CHANGELOG.md` (ce fichier) et `TODO.md` à la racine du projet

---

## 2026-08-29

### Commit du travail en attente
- Commit `e36442c` : tous les fixes d'audit Phase 1, la chauffe WhatsApp, l'essai gratuit et les migrations 003-006, poussés sur `origin/main`
- Configuration de l'identité git locale (`Martin Roelandt <martinr5347@gmail.com>`, cohérente avec les commits précédents)

### Phase 3 — items non bloqués par des clés manquantes
- **Portail Stripe** : `app/api/stripe/create-portal/route.ts` créé (route API, prévue au spec) + bouton "Gérer mon abonnement" directement dans `/dashboard/settings` (server action `openBillingPortal`, même logique inline que le reste de la page)
- **Templates email en HTML** : `lib/dispatcher/index.ts` `renderTemplate()` accepte une nouvelle variable `{{nombre_cabinet}}` (déjà disponible via `appt.organizations.nom`, juste jamais exposée). Migration `007_html_email_templates.sql` réécrit les 6 templates email par défaut (es) en HTML avec bouton CTA pour les emails avec lien de paiement. **Non appliquée par moi** — bloquée par le sandbox réseau (voir plus bas), à appliquer manuellement par l'utilisateur via le SQL Editor Supabase.
- **i18n pt-BR** : Migration `008_pt_templates.sql` — miroir complet des 12 templates (6 types × 2 canaux) en portugais, en HTML pour les emails (cohérent avec 007). Ajout d'un sélecteur de langue dans `/dashboard/settings` (écrit dans `organizations.langue`, table jusque-là jamais modifiable depuis l'UI — sans ce champ les templates pt n'auraient jamais pu être déclenchés). **Migrations non appliquées**, même blocage.
- Validation : `tsc --noEmit` et `next lint` propres. `next build` non exécuté pour ne pas entrer en conflit avec le serveur dev déjà lancé par l'utilisateur.

### Blocage réseau sandbox découvert en essayant d'appliquer les migrations
- Tentative 1 : connexion Postgres directe via le pooler (`aws-0-sa-east-1.pooler.supabase.com:6543`, credentials trouvés en commentaire dans `.env.local`) → bloquée d'abord par le classificateur de permissions (autorisée après confirmation utilisateur), puis rejetée par Supabase (`tenant/user postgres.uxpnzodhmpqlaqsfpxzz not found`) — mot de passe DB probablement périmé (le `SUPABASE_SERVICE_ROLE_KEY` est déjà au nouveau format `sb_secret_...`, signe que le projet a fait tourner ses identifiants depuis)
- Tentative 2 : appel REST via `@supabase/supabase-js` (clé service-role) → `fetch failed`, DNS du domaine `*.supabase.co` du projet bloqué par le sandbox réseau lui-même (confirmé : `api.github.com` résout et répond normalement, seul le sous-domaine du projet Supabase échoue)
- **Conclusion** : dans ce sandbox, seules les connexions vers des hôtes fixes/génériques (ex. `pooler.supabase.com`) passent le réseau ; les sous-domaines spécifiques au projet Supabase (`*.supabase.co`) sont bloqués en DNS. Toute future migration devra être appliquée manuellement via le SQL Editor Supabase, pas par un script lancé depuis cet environnement.
