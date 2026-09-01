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
- **Découverte** : l'outil PowerShell de cet environnement tourne bien sur le vrai poste Windows (accès réseau complet, y compris `*.supabase.co`), contrairement à l'outil Bash qui tourne dans un conteneur isolé. Pour toute manipulation Supabase (REST, tests via webhook local), utiliser PowerShell, pas Bash.
- Migrations 007 et 008 appliquées par l'utilisateur via le SQL Editor Supabase. Testées en réel : webhook Calendly synthétique (org de test créée/supprimée via REST + service role, `User-Agent` non-navigateur nécessaire car Supabase bloque le nouveau format de clé `sb_secret_...` s'il détecte un appel "navigateur") → confirmation email HTML reçue en es puis en pt après bascule de `organizations.langue`, `statut: sent` dans les deux cas.

### Bugs trouvés en relisant les emails de test reçus (retour utilisateur)
- 🔴 **Devise MercadoPago codée en dur** : `lib/payments/mercadopago.ts` envoyait toujours `currency_id: 'PEN'` à l'API MercadoPago, sans tenir compte de `org_settings.monnaie` — tout cabinet hors Pérou aurait été facturé dans la mauvaise devise. `createPaymentLink` prend maintenant un paramètre `currency` explicite, fourni par `app/api/webhooks/calendly/route.ts` depuis `org_settings.monnaie`.
- 🟠 **Champ devise absent de l'UI** : `org_settings.monnaie` existait en base et dans la route API `PATCH /api/settings`, mais jamais dans le formulaire réellement utilisé (`/dashboard/settings`) — impossible à changer en pratique. Ajout d'un `<select>` avec les devises LatAm courantes (PEN, BRL, MXN, COP, CLP, ARS, UYU, USD).
- 🟠 **Date/heure brutes dans les messages** : `{{fecha_cita}}`/`{{hora_cita}}` interpolaient directement les valeurs stockées en base (`2026-09-01`, `11:09:13`) sans mise en forme lisible. Ajout de `formatDisplayDate`/`formatDisplayTime` dans `lib/utils/timezone.ts` (format long localisé es-PE/pt-BR pour la date, `HH:mm` sans secondes pour l'heure) — uniquement pour l'affichage, le stockage en base reste inchangé (nécessaire pour les crons/tri).
- 🟡 **Sujet des emails jamais templaté** : seul `corps` passait par `renderTemplate()`, jamais `sujet` — impact réel uniquement sur `pago_praticien` dont le sujet contient `{{nom_patient}}`/`{{fecha_cita}}` (aurait affiché les variables brutes non substituées au praticien). Corrigé dans les deux points d'envoi du dispatcher.
- Retesté en réel après correction (nouvelle org de test PEN, webhook Calendly) : notification `sent`, email reçu avec date longue lisible.

### Refonte visuelle des emails (retour utilisateur : "ça manque d'illustration, de mise en page")
- Migration `009_email_visual_redesign.sql` : bandeau coloré avec icône emoji par type de notification (📅 confirmation, ⏰ aviso, ✅ pago, 💰 pago_praticien, ❌ anulacion, 🔔 recordatorio), encart date/heure mis en valeur dans une carte grise, carte globale à bordure arrondie. Les 12 templates (6 types × es/pt) réécrits en cohérence.
- **Bug d'encodage découvert en appliquant la migration** : le script PowerShell appelant l'API Supabase avec les caractères accentués/emoji en UTF-8 brut échouait sur la moitié des templates (`PGRST102 Empty or invalid json`) — Windows PowerShell 5.1 lit les fichiers `.ps1` sans BOM avec le codepage système, pas en UTF-8, ce qui corrompait les caractères multi-octets avant même l'exécution du script. **Solution adoptée** : tous les caractères non-ASCII (accents es/pt, emoji) sont désormais écrits en entités HTML numériques (`&#225;`, `&#128197;`, etc.) dans le SQL et dans tout script d'automatisation — 100% ASCII, aucune ambiguïté d'encodage possible, et ça reste un HTML strictement valide. À réutiliser pour toute future migration de contenu texte.
- Retesté en réel (nouvelle org, webhook Calendly) : notification `sent`, contenu vérifié intact en base (entités non corrompues).

### Contenu manquant vs. modèle de production réel (retour utilisateur, comparaison avec l'email réel de Rocío)
- L'utilisateur a montré l'email réel en production (Make + Google Sheets, cabinet de Rocío) : bien plus riche que mon redesign — adresse du cabinet, coût total de la consultation avec détail acompte/reste à payer sur place, signature personnalisée. Décision : ajouter adresse + coût total (génériques, utiles à tous les cabinets) ; la signature/citation personnalisée reste hors scope (branding propre à Rocío, pas un besoin générique SaaS).
- Migration `010_costo_total.sql` : nouvelle colonne `org_settings.costo_total` (nullable — optionnel par cabinet).
- `organizations.adresse` (colonne déjà existante dans le schéma mais jamais exposée) : ajoutée aux paramètres du cabinet.
- `lib/dispatcher/index.ts` `renderTemplate()` : refonte pour supporter une syntaxe conditionnelle `{{#if variable}}...{{/if}}` (le bloc est retiré si la variable est vide) — nécessaire car l'adresse et le détail de coût sont optionnels par cabinet. Nouvelles variables : `{{direccion}}`, `{{costo_total}}`, `{{resto_pagar}}` (= costo_total - monto_acompte, seulement si costo_total > monto_acompte).
- Migration `011_email_direccion_costo.sql` : ajoute les blocs conditionnels adresse (dans l'encart date/heure) et détail de coût aux 4 templates concernés par un RDV à venir (confirmation, aviso, pago, recordatorio), es + pt. `anulacion` et `pago_praticien` inchangés (non pertinent).
- Fichier écrit directement en entités HTML ASCII cette fois (leçon de la migration 009) — zéro problème d'encodage à l'application.
- **Bloquant rencontré** : `org_settings.costo_total` nécessite une migration de schéma (ALTER TABLE), donc pas applicable via l'API REST Supabase (PostgREST ne fait que du CRUD, pas de DDL) — l'utilisateur l'a appliquée elle-même via le SQL Editor.
- Testé en réel avec adresse + coût total renseignés (acompte 20, coût total 120) et un nom de patient réaliste ("Martin Roelandt", pas un nom de test avec "Paciente" dedans — ce mot ne vient jamais du template, seulement des données de test précédentes) : notification `sent`.

### Test de bout en bout du cycle de vie complet (demande utilisateur)
- Créé une org de test avec un vrai compte praticien lié (via l'API Auth admin Supabase) pour valider aussi l'alerte `pago_praticien`, pas seulement les notifications patient.
- Testé en conditions réelles, avec les vrais crons et webhooks (pas de mock) :
  - Paiement reçu (webhook MercadoPago simulé avec un `external_reference` réel) → statut `pagado`, notifications `pago` + `pago_praticien` envoyées
  - Rappel 24h avant RDV (`fecha_cita`/`hora_cita` recalées dans la fenêtre de rappel, fuseau America/Lima) → notification `recordatorio` envoyée
  - Relance avant annulation (`fecha_reserva` recalée à 7h dans le passé, entre delai_aviso_h=6 et delai_paiement_h=12) → notification `aviso` envoyée
  - Annulation automatique (`fecha_reserva` recalée à 13h dans le passé) → statut `anulado`, notification `anulacion` envoyée
- Confirmé à l'utilisateur que les délais (paiement/aviso/rappel) sont déjà configurables par cabinet dans Paramètres — pas une nouvelle demande, déjà couvert par `org_settings.delai_paiement_h/delai_aviso_h/delai_rappel_h`.
- **Bug d'outillage rencontré et résolu** : plusieurs tentatives de relance du serveur dev via `Start-Process` sont restées orphelines (process node/cmd zombies compétant sur le même dossier `.next`), provoquant des timeouts de 2 minutes sur les appels PowerShell suivants. Tués manuellement (`Stop-Process`), puis serveur relancé via `[System.Diagnostics.Process]::Start` avec `cmd.exe /c npm run dev > log 2> log` pour un détachement plus propre.

### Bouton "Reagendar" sur l'email d'annulation (retour utilisateur)
- Migration `012_anulacion_reagendar.sql` : ajoute un bouton pointant vers `{{calendly_url}}` (déjà stocké dans `org_settings`, jamais réutilisé dans un template) sur l'email d'annulation, es + pt, dans un bloc `{{#if calendly_url}}`.
- `renderTemplate()` : nouvelle variable `calendly_url`.
- Retesté en réel (nouvelle org, annulation auto déclenchée) : notification `sent`.

---

## 2026-09-01/02

### Phase 2 — WhatsApp configuré et testé en réel
- Clé Unipile fournie par l'utilisateur (`UNIPILE_API_KEY`, `UNIPILE_BASE_URL=https://api13.unipile.com:14315`), ajoutées à `.env.local`
- Découverte automatique du compte WhatsApp connecté via `GET /api/v1/accounts` (évite de demander l'`account_id` manuellement) — premier compte testé avait le statut `CREDENTIALS` (pas pleinement actif), l'utilisateur en a connecté un second qui est passé à `OK`
- **Bug critique corrigé** : l'endpoint WhatsApp utilisé (`POST /v2/:account_id/chats/send`, JSON) était incorrect — confirmé en 404 en réel. Recherche de la doc officielle Unipile (`developer.unipile.com`) : `/v2/` sans préfixe `/api/` n'existe pas du tout sur ce serveur (404 rapide, route Express/Nest non trouvée) et `/api/v2/` ne répond jamais (connexion qui reste ouverte indéfiniment, y compris testé avec un `HttpClient` .NET à timeout strict — pas un problème d'outillage, le endpoint n'existe juste pas). Le seul endpoint réellement fonctionnel est `POST /api/v1/chats` en **multipart/form-data** (pas JSON), avec `account_id` + `attendees_ids` + `text` dans le body (pas dans l'URL). Confirmé par un appel direct (201, message reçu) puis via le flux complet de l'app. `lib/dispatcher/channels/whatsapp.ts` réécrit en conséquence (FormData natif, plus de JSON).
- **Bug d'encodage PowerShell découvert (nouveau, différent de celui de la migration 009)** : `Invoke-RestMethod -Body <string>` encode le corps de la requête avec l'encodage codepage système par défaut, pas en UTF-8 — corrompt silencieusement TOUT caractère non-ASCII envoyé vers l'API Supabase depuis un script PowerShell (pas seulement un problème de lecture de fichier `.ps1` comme en migration 009). Un emoji astral (ex. 📅, U+1F4C5, encodé en paire de substituts UTF-16) devient littéralement deux caractères `?` en base — silencieux, aucune erreur HTTP. Détecté en relisant le contenu réellement stocké (`GET` puis écriture dans un fichier UTF-8 local, jamais faire confiance à l'affichage console PowerShell qui a son propre problème de rendu des emoji). **Solution** : convertir le JSON en `byte[]` via `[System.Text.Encoding]::UTF8.GetBytes(...)` et le passer tel quel à `-Body`, avec `-ContentType "application/json; charset=utf-8"` explicite — contourne l'encodeur par défaut de PowerShell. À réutiliser pour toute future écriture de contenu non-ASCII vers l'API Supabase.
- Migration `013_whatsapp_richer_templates.sql` : les templates WhatsApp (texte brut, jamais retouchés depuis le seed initial) enrichis avec mise en forme multi-lignes, adresse et détail de coût (mêmes blocs conditionnels `{{#if}}` que les emails), lien de paiement isolé sur sa propre ligne. Un cas limite rencontré : le caractère `¡` (U+00A1, plage Latin-1) faisait échouer le JSON même avec l'encodage bytes correct — retiré des deux templates concernés (omettre le `¡` d'ouverture est courant en espagnol informel/SMS).
- Testé en réel de bout en bout via le vrai flux de l'app (webhook Calendly → dispatcher → Unipile) : notification `sent`, message reçu sur un vrai téléphone avec emoji et accents corrects.
- Confirmé par l'utilisateur (capture d'écran WhatsApp) : mise en forme correcte, lien bien cliquable (souligné en bleu) — le souci initial constaté sur l'ancien template plat ne s'est pas reproduit.

### `ADMIN_EMAIL` configuré et testé
- `ADMIN_EMAIL=martinr5347@gmail.com` ajouté à `.env.local` — jusque-là vide, les alertes admin retombaient sur `EMAIL_FROM` (`onboarding@resend.dev`, une adresse non consultée)
- Testé en réel : webhook Calendly avec `calendly_url` ne correspondant à aucun cabinet → alerte "Webhook Calendly : cabinet introuvable" bien reçue

### Cycle de vie complet WhatsApp testé en réel (demande utilisateur)
- 3 cabinets de test distincts (confirmation+paiement, confirmation+aviso, confirmation+annulation) — nécessaire car la chauffe WhatsApp (`org_settings`/quota journalier) est calculée par organisation, pas par compte Unipile/numéro : réutiliser le même cabinet pour tous les scénarios aurait consommé le quota de 5 msg/jour avant la fin du test
- Scénario paiement : confirmation → paiement MercadoPago simulé (18s d'attente respectant le délai anti-bot de 15s entre deux messages) → notification `pago` envoyée
- Scénario relance : confirmation → `fecha_reserva` recalée à 7h dans le passé → cron `payment-reminder` → notification `aviso` envoyée
- Scénario annulation : confirmation → `fecha_reserva` recalée à 13h dans le passé → cron `payment-deadline` → statut `anulado` + notification `anulacion` (avec bouton de reprise de RDV) envoyée
- Un envoi de confirmation a échoué avec `fetch failed` (erreur réseau transitoire ponctuelle vers Unipile, non reproduite sur les 4 autres envois du même test) — sans lien avec le code, l'annulation qui suivait sur le même appointment s'est envoyée normalement
- **Limite de conception notée (pas corrigée, à valider avant d'y toucher)** : le quota de chauffe WhatsApp est suivi par `organization_id`, alors que la contrainte réelle (anti-ban WhatsApp) s'applique au numéro/compte Unipile. Si plusieurs cabinets partageaient un jour le même compte Unipile, chacun aurait son propre quota de 5/jour, dépassant collectivement la limite réelle prudente pour le numéro. Non pertinent tant qu'un cabinet = un numéro WhatsApp dédié (cas d'usage actuel).

---

## 2026-09-02

### Sélecteur de modèle de message (demande utilisateur)
- Nouvelle fonctionnalité : dans `/dashboard/settings`, un bouton radio par type de notification (confirmation, aviso, pago, anulacion, recordatorio — 5 types ; `pago_praticien` reste fixe, non exposé car interne) permet de choisir entre 2 styles prédéfinis : "Estándar" (contenu actuel, repris tel quel) et "Cercano y cálido" (ton plus personnel, nouveau contenu rédigé pour l'occasion). Les variables ({{nom_patient}}, {{fecha_cita}}, {{link_pago}}...) et la structure (bandeau coloré, encart date/adresse, bouton) restent identiques entre variantes — seul le texte change.
- `lib/dispatcher/templateVariants.ts` : catalogue statique (code, pas en base) des 2 variantes × 5 types × 2 canaux (email/whatsapp) × 2 langues (es/pt) = 40 contenus. Le "standard" reprend exactement les templates par défaut existants (migrations 009/011/012/013) ; le "calido" est un nouveau ton chaleureux rédigé pour cette fonctionnalité.
- **Choix d'architecture** : plutôt que de faire lire le catalogue directement par le dispatcher au moment de l'envoi (aurait nécessité de modifier `loadTemplate()`, code déjà testé en production), la sélection d'une variante **matérialise** son contenu dans un override org-spécifique de `message_templates` (même mécanisme déjà utilisé pour l'i18n pt) — à chaque sauvegarde des paramètres, les 5 types × 2 canaux sont réécrits avec le contenu de la variante choisie, dans la langue actuelle du cabinet. Le moteur de rendu (`renderTemplate`, `loadTemplate`) n'a pas changé.
- Migration `014_message_variants.sql` : nouvelle colonne `org_settings.variantes_mensaje` (jsonb, ex. `{"confirmation":"calido"}`) — stocke uniquement le *choix*, pas le texte (qui reste dans le code).
- `types/database.ts` mis à jour (`variantes_mensaje: Json`).
- Testé en réel (simulation fidèle de ce que ferait `updateSettings()` : écriture `org_settings.variantes_mensaje` + override `message_templates` avec le contenu "calido" de la confirmation, puis webhook Calendly réel) : notification `sent`.
- **Reste à faire** : tester la vraie page `/dashboard/settings` dans un navigateur (radio buttons, sauvegarde) — le test ci-dessus valide le mécanisme de données mais pas l'interface elle-même.
