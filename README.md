# Muhammad Hamza Shamsi · Portfolio

Personal portfolio: M.Sc. AI student at FAU Erlangen-Nürnberg and former DevOps & IT Infrastructure Engineer.

## Structure

```
index.html        Frontend (single page, no build step)
api/contact.js    Backend: Vercel serverless function that emails contact-form messages via Resend
.env.example      Environment variables the backend needs
```

## Deploy on Vercel (frontend + backend)

1. Go to [vercel.com/new](https://vercel.com/new) and import this repository.
2. Framework preset: **Other**. Leave build and output settings empty.
3. Create a free account at [resend.com](https://resend.com) and create an API key.
4. In Vercel → Project → Settings → Environment Variables, add:
   - `RESEND_API_KEY`: your Resend key
   - `CONTACT_TO_EMAIL`: the inbox that should receive messages
   - `CONTACT_FROM_EMAIL` (optional): a sender on a domain verified in Resend
5. Redeploy. The site is live, and the contact form posts to `/api/contact`.

> Without a verified domain, Resend's test sender (`onboarding@resend.dev`) only delivers to the email you signed up to Resend with, so use that address as `CONTACT_TO_EMAIL`.

## Deploy on GitHub Pages (frontend only)

Settings → Pages → Source: **Deploy from a branch** → `main` / root. The site goes live at
`https://muhammad-hamzashamsi.github.io/portfolio/`.

GitHub Pages can't run the `/api` function, so the contact form there shows a message pointing visitors to LinkedIn. Use Vercel if you want the form to work.

## Run locally

```bash
npm i -g vercel
cp .env.example .env.local   # fill in values
vercel dev
```
