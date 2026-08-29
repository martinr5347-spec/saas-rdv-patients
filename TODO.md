# TODO — État d'avancement

> Voir [`CHANGELOG.md`](./CHANGELOG.md) pour l'historique détaillé de chaque tâche technique.
> Ce fichier donne un instantané de l'état actuel : ce qui est fait, testé, et ce qui reste à faire.

Dernière mise à jour : 2026-08-29

---

## Phases (cahier des charges)

| Phase | Statut |
|---|---|
| Phase 0 — Fondations | ✅ Terminée et testée en réel |
| Phase 1 — MVP email (F2-F10) | ✅ Terminée, auditée et testée en réel |
| Phase 2 — WhatsApp | 🟡 Code prêt (API v2 + chauffe des numéros), **jamais testé en réel** (pas de clé Unipile) |
| Phase 3 — Self-service & polish | 🟡 Portail Stripe + HTML + i18n pt codés (migrations 007/008 pas encore appliquées) |

---

## Bloquants actuels (clés/config manquantes)

| Variable | Sert à | Statut |
|---|---|---|
| `UNIPILE_API_KEY` + `UNIPILE_BASE_URL` | Envoi WhatsApp | ❌ En attente (l'utilisateur a dit "incessamment") |
| `ADMIN_EMAIL` | Reçoit les alertes d'erreurs internes (F12) | ❌ Non configuré — sans ça, `alertAdminEmail` retombe sur `EMAIL_FROM` (`onboarding@resend.dev`, pas une vraie boîte + bloqué par la restriction sandbox Resend) |
| Domaine vérifié sur Resend | Envoyer des emails à de vrais patients (pas juste au compte Resend) | ❌ `onboarding@resend.dev` ne peut envoyer qu'à `martinr5347@gmail.com` |
| `WEBHOOK_SECRET_CALENDLY` | Vérifier l'authenticité des webhooks Calendly | ❌ Vide — vérification de signature désactivée tant que non configuré (à récupérer depuis un vrai compte Calendly connecté) |
| `WEBHOOK_SECRET_MERCADOPAGO` | Idem pour MercadoPago | ❌ Vide, même limite |

## Configuré et validé en réel

- ✅ Supabase (DB, RLS, migrations 001 à 006)
- ✅ Stripe (mode test) — plans créés, checkout + webhook testés de bout en bout
- ✅ MercadoPago (`MP_ACCESS_TOKEN_TEST`) — génération de lien de paiement réelle testée
- ✅ Resend (`RESEND_API_KEY`) — envoi réel testé (email direct + flow complet dispatcher)
- ✅ `CRON_SECRET` — généré, 3 crons testés (accepté/rejeté correctement)

## Migrations écrites mais pas encore appliquées

- ⚠️ `007_html_email_templates.sql` (templates email es en HTML) et `008_pt_templates.sql` (miroir pt-BR complet) — impossibles à appliquer depuis l'environnement Claude Code (voir CHANGELOG 2026-08-29, blocage réseau sandbox sur `*.supabase.co` + credentials pooler périmés). **À appliquer manuellement via le SQL Editor Supabase** : https://supabase.com/dashboard/project/uxpnzodhmpqlaqsfpxzz/sql/new

---

## Reste à faire

### Court terme
- [ ] Appliquer `007_html_email_templates.sql` et `008_pt_templates.sql` via le SQL Editor Supabase
- [ ] Configurer `UNIPILE_API_KEY` / `UNIPILE_BASE_URL` dès réception → tester le flow WhatsApp complet (envoi réel + vérifier le bon nom d'endpoint, incertain entre `/chats/send` et `/chats/start` selon les pages de doc Unipile)
- [ ] Définir `ADMIN_EMAIL` (au moins une adresse temporaire type `martinr5347@gmail.com`, en attendant un domaine pro)
- [ ] Vérifier un domaine sur resend.com/domains pour pouvoir envoyer à de vrais patients
- [ ] Mettre à jour le connection string Postgres direct en commentaire dans `.env.local` (rejeté par Supabase — mot de passe probablement périmé depuis la rotation vers le nouveau format de clés `sb_secret_...`), ou l'enlever si plus utile

### Phase 3
- [x] Portail Stripe (gestion abonnement) — `app/api/stripe/create-portal/route.ts` + bouton dans `/dashboard/settings`
- [x] i18n templates (es/pt) — sélecteur de langue ajouté dans `/dashboard/settings`, templates pt en base (migration 008, pas encore appliquée)
- [x] Mise en forme HTML des templates d'emails — migration 007 (pas encore appliquée)
- [ ] Tester en réel une fois les migrations 007/008 appliquées : email HTML bien rendu, bascule pt fonctionnelle de bout en bout

### Idées / améliorations non demandées explicitement (à valider avant de faire)
- [ ] Indicateur visuel dans `/dashboard/settings` du statut de chauffe WhatsApp (jour actuel / quota du jour) — actuellement seule la base de données le sait
- [ ] Cron de retry pour les notifications `failed` (aujourd'hui, seuls F7/F8 re-tentent automatiquement via leur cycle périodique ; une confirmation Calendly ou une alerte paiement en échec définitif n'a pas de retry automatique)

---

## Notes importantes pour reprendre le travail

- Le serveur dev tourne via `npm run dev` depuis `c:\Users\marti\Desktop\SAAS\saas-rdv-patients` — **fermer/rouvrir VSCode après toute install globale** (Node, Stripe CLI...) pour que le PATH se rafraîchisse
- Toujours arrêter le serveur dev avant `npm run build` (les deux écrivent dans `.next` et se corrompent mutuellement si lancés en même temps)
- Les scripts de test temporaires (`_test_*.mjs`, `_cleanup_test.mjs`) sont toujours supprimés après usage — n'en laisser traîner aucun dans le repo
- Le package `pg` est utilisé ponctuellement (`npm install --no-save pg`) pour appliquer les migrations SQL directement via la connexion Postgres (pas de Supabase CLI configuré) — toujours désinstallé/non committé après usage
