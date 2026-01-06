---
title: Signoz on Kubernetes Errors
---

## Error from server (NotFound): jobs.batch "signoz-schema-migrator" not found

An ```helm upgrade``` would fix this issue.

## Error:"2023-10-24T06:46:53.083Z ERROR clickhouseReader/reader.go:137 failed to initialize ClickHouse: error connecting to primary db: code: 516, message: admin: Authentication failed: password is incorrect, or there is no user with such name." timestamp: "2023-10-24T06:46:53.083173036Z

headache of Multi-Attach error for volume "pvc-xxxxxx" Volume is already used by pod(s) chi-signoz-clickhouse-cluster-0-0-0

this happens when you have autoscaling available, when your pods gets rescheduled, just change it to ManyWrite


https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-ubuntu-64-snap.html fixes the ssm agent setup for ubuntu instances

If it's at a non-standard location, specify the URL with the DOCKER_HOST environment variable., juse use sudo

sudo curl -L "https://github.com/docker/compose/releases/download/2.34.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
cp  /usr/local/bin/docker-compose /usr/bin/docker-compose
sudo /usr/bin/docker-compose -h

sudo /

cd ~/hosting

plausible-conf.env
ADMIN_USER_EMAIL=user@domain.com
ADMIN_USER_NAME=USERNAME
ADMIN_USER_PWD=YOUR_ADMIN_PASS
BASE_URL=https://plausible.domain.com
SECRET_KEY_BASE=sudo openssl rand -base64 64
DISABLE_REGISTRATION=true
MAILER_EMAIL=user@domain.com
SMTP_HOST_ADDR=smtp.YOURSMTP_SERVER.com
SMTP_HOST_PORT=465
SMTP_HOST_SSL_ENABLED=true
SMTP_USER_NAME=user@domain.com
SMTP_USER_PWD=YOURMAIL_SMTP_PASSWORD
SMTP_RETRIES=2

  plausible:
    image: plausible/analytics:v2.0
    restart: always
    command: sh -c "sleep 10 && /entrypoint.sh db createdb && /entrypoint.sh db migrate && /entrypoint.sh run"
    depends_on:
      - plausible_db
      - plausible_events_db
      - mail
    ports:
      - 127.0.0.1:8000:8000
    env_file:
      - plausible-conf.env

from 8000:8000 to 127.0.0.1:8000:8000


sudo apt update
sudo apt install nginx
sudo ufw allow "Nginx Full"
sudo nano /etc/nginx/sites-available/plausible.conf
```
server {
        # replace example.com with your domain name
        server_name analytics.example.com;

        listen 80;
        listen [::]:80;

        location / {
                proxy_pass http://127.0.0.1:8000;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
}
```

listen on port 80 and proxy all the requests to localhost:8000 where plausible instances is listening

sudo ln -s /etc/nginx/sites-available/plausible.conf /etc/nginx/sites-enabled/

sudo nginx -t

sudo systemctl reload nginx

sudo apt-get install certbot python-certbot-nginx

sudo certbot

sudo apt-get update
sudo apt-get install certbot
sudo apt-get install python3-certbot-nginx

sudo certbot --nginx -d analytics.example.com
mad changes to plausible config?

sudo /usr/bin/docker-compose down --remove-orphans

sudo docker compose down --remove-orphans

and then sudo /usr/bin/docker-compose up -d

sudo docker compose up -d

Fix: https://github.com/SigNoz/charts/issues/63#issuecomment-1209071122