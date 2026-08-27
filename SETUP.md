# Setting up MCII on a Mac

Written for someone who has never used Terminal. Do these in order. Anything in a grey box gets
pasted into Terminal and followed by the Return key.

To open Terminal: press **Cmd + Space**, type `Terminal`, press Return.

---

## 1. Install Homebrew  (about 10 minutes)

Homebrew installs other tools. Paste this whole line:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

It asks for your Mac login password. **Nothing appears as you type it** — that is normal, not a
frozen screen. Type it and press Return.

When it finishes it may print two more commands under "Next steps". Run them. If you skip this,
everything below will say "command not found" — that is the single most common thing to go wrong.

## 2. Install Node and the GitHub tool

```
brew install node gh
```

## 3. Check it worked

```
node --version && npm --version
```

Two version numbers means you are fine. If you get "command not found", quit Terminal completely
(Cmd + Q, not just closing the window) and open it again — the settings only apply to new windows.

## 4. Sign in to GitHub

```
gh auth login
```

Answer with the arrow keys and Return: **GitHub.com** → **HTTPS** → **Y** → **Login with a web
browser**. It shows a one-time code — copy it, press Return, paste it into the page that opens,
and click Authorize.

## 5. Get the project

```
cd ~/Documents && gh repo clone connalhedgcock-design/mcii MCII
```

If this says "not found", Connal has not added you to the repository yet. It is private, so
nothing will work until he does.

## 6. Install what the app needs

```
cd ~/Documents/MCII/app && npm install
```

## 7. Run it

```
cd ~/Documents/MCII/app && npm start
```

---

## Getting the latest data

Data is collected in the cloud every hour and shared through GitHub. To pull it down:

```
cd ~/Documents/MCII && git pull
```

Do this whenever you open the app. Everything else happens by itself.

## Things worth knowing

**You do not need any API keys.** Everything the app reads live is free, and the paid part
(social data) is collected in the cloud and shared with you. There is nothing to sign up for.

**The app cannot trade.** It holds no wallet keys and no exchange logins. There is no version of
this that can move money.

**Leaving it open is useful but not required.** It watches prices every 15 seconds while open,
but the cloud collector runs hourly regardless, so nothing is lost when your laptop is shut.

## If something breaks

Run this and send the output to Connal:

```
cd ~/Documents/MCII/app && node --version && npm --version && git log --oneline -1
```
