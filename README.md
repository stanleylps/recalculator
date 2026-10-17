# LearnwithStanley Calculators

Free financial planning calculators for learnwithstanley.com/recalculator.

Retirement
- **Goal planner** (`goal/`): monthly income you want → portfolio needed, monthly saving, and how long the money lasts.
- **Portfolio projection** (`projection/`): monthly saving → future portfolio, in today's dollars, and the income it could pay.
- **Drawdown** (`drawdown/`): lump sum + monthly income → how long it lasts, and the safe withdrawal for a target number of years.
- **Cost of delay** (`cost-of-delay/`): what waiting N years to start saving costs, and the catch-up saving.

Saving and investing
- **Education fund** (`education/`): monthly saving for university fees with education inflation.
- **Emergency fund** (`emergency-fund/`): target months of expenses and time to build it.
- **Lump sum vs monthly** (`lump-vs-dca/`): investing all at once vs spreading it out, with an optional market move.

Debt
- **Loan and mortgage** (`loan/`): instalment, total interest, and the effect of extra monthly payments.
- **Debt payoff** (`debt-payoff/`): snowball vs avalanche across several debts.

Protection and overview
- **Insurance needs** (`insurance/`): needs-based life cover estimate and protection gap.
- **Net worth** (`net-worth/`): assets minus liabilities with a breakdown.

Plus **Disclosure** (`disclosure/`), linked from the footer of every page.

Plain HTML, CSS and JavaScript. No build step, no dependencies, no server code. Every link is relative, so the site works under any subfolder.

## Run it on your computer

```bash
python3 dev-server.py
```

Then open http://localhost:8080/recalculator/

## Check the math

```bash
node tests/calc.test.js
```

## Deploy to learnwithstanley.com/recalculator

Upload these files into a folder called `recalculator` at the root of your website (the same place your homepage `index.html` lives):

```
index.html
assets/
every tool folder (goal/, projection/, drawdown/, cost-of-delay/, education/,
  emergency-fund/, lump-vs-dca/, loan/, debt-payoff/, insurance/, net-worth/, disclosure/)
```

You don't need to upload `tests/`, `scripts/`, `dev-server.py`, `README.md` or `.claude/`.

To make a zip with only the files the website needs:

```bash
zip -r recalculator.zip . -x "tests/*" "scripts/*" ".claude/*" ".git/*" dev-server.py README.md .gitignore
```

How to upload depends on your host:

- **cPanel / shared hosting / FTP:** in File Manager (or your FTP app) open `public_html`, create a folder `recalculator`, and upload the files into it (or upload the zip and extract it there).
- **WordPress (self-hosted):** same as above. Put the `recalculator` folder inside `public_html` next to `wp-content`. WordPress leaves real folders alone, so the URL works.
- **Netlify, Vercel, Cloudflare Pages, GitHub Pages:** put these files in a `recalculator/` folder inside the site's published directory and redeploy.
- **Squarespace, Wix, hosted WordPress.com:** these don't let you upload folders. Host the calculator on a free static host (for example Netlify or Cloudflare Pages) and either point a subdomain such as `tools.learnwithstanley.com` at it, or embed each page in an iframe on a page at `/recalculator`.

## Adding another tool later

1. Copy an existing tool folder, e.g. `loan/`, to a new folder.
2. Put its math in `assets/js/calc.js` (with a test in `tests/calc.test.js`) and its page logic in `assets/js/<tool>.js`.
3. Add a card to the right group on the home page `index.html`.
4. Run `python3 scripts/sync-layout.py` so the new page gets the shared header, footer, fonts and disclosure.

## Changing the currency symbol

Edit `CURRENCY` at the top of `assets/js/ui.js`, and the `$` signs inside the input boxes in each page's HTML.

## How the math works

- Annual return and inflation are converted to equivalent monthly rates, so 12 months compound to exactly the annual figure.
- Savings go in at the end of each month.
- Target portfolio = first-year retirement income ÷ drawdown rate. Income is your chosen amount grown by inflation until retirement.
- In retirement, income is withdrawn at the start of each month and rises with inflation every month. "Money lasts" is how long until the balance can't cover a month's income (capped at 100 years).
- Returns and inflation are steady every year. Real markets vary, so treat results as a quick check, not a guarantee.
