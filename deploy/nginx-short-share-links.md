# Short share links — `/t/<token>` instead of `/api/share/t/<token>`

Test-result share links currently work at:

    https://myeduport.ai/api/share/t/<token>

Having `/api/` in a link posted to Facebook or Instagram looks wrong. This makes it:

    https://myeduport.ai/t/<token>

## Do it

```bash
sudo bash /home/dev/MyEduPort/deploy/enable-share-links.sh
```

One command. It backs up the nginx config, adds the `/t/` block, runs `nginx -t` and only
reloads if that passes (restoring the backup if it doesn't), sets `SHARE_PATH=/t/` in
`backend/.env`, restarts the API, and then fetches a real URL to prove the route answers.
Running it twice is harmless.

It needs root because `/etc/nginx` does, which is the only reason it isn't already applied.

## Why it needs nginx at all

nginx serves the React build directly and forwards only `/api/`, `/uploads/` and `/health`
to the Node backend — everything else falls through to `index.html`.

The share page has to come from the backend as real HTML, because the Facebook and X
crawlers don't run JavaScript. A link into the React app would always preview with the
generic site title and description instead of the student's actual result.

## What changes

The script inserts this just above the SPA fallback (`^~` stops nginx from testing regex
locations once the prefix matches):

```nginx
    location ^~ /t/ {
        proxy_pass http://127.0.0.1:4000/api/share/t/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

and sets `SHARE_PATH=/t/`, which `backend/src/routes/testShare.js` reads when it hands out
a link. The default is `/api/share/t/`, so leaving it unset keeps today's behaviour.

**Links already posted to social media keep working.** The backend still serves
`/api/share/t/<token>`; only newly copied links use the short form.

## If you want to undo it

```bash
sudo cp /etc/nginx/sites-available/myeduport.ai.bak.<timestamp> /etc/nginx/sites-available/myeduport.ai
sudo nginx -t && sudo systemctl reload nginx
# then remove the SHARE_PATH line from backend/.env and: pm2 restart myeduport-backend
```

## Verified before shipping

The config edit was applied to a copy of the live site file and checked with a real
`nginx -t` run: *"syntax is ok"*. Brace balance held, the `/t/` block landed above the SPA
fallback, and the fallback stayed last.
