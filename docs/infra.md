# Infra

## Setup

- Get a server with a static IP address.

	You can use whatever service you want – I signed up for Linode, I know Digital Ocean is pretty simple to.

- SSH into the server so we can start setting things up.

	```sh
	apt-get update
	apt-get install -y git nodejs npm
	```

- Setup an ssh key on the server so you can pull changes from Github.

	```sh
	ssh-keygen -t ed25519 -C "YOUR_EMAIL"
	cat ~/.ssh/id_ed25519.pub
	# Add to Github https://github.com/settings/keys
	```

- Boot up your app.

	```sh
	git clone ...
	npm install
	npm run boostrap
	NODE_ENV=production npm start
	```

Now if you go to your server's IP address, port 8080, you should see your app running!

- Buy a domain and point it to your server.

	I use Cloudflare for my DNS.

	You'll want to set the `A HOST` DNS record to the IP address of your server.

- Install Caddy web server.

	Caddy is great because it handles SSL/HTTPS and also makes it easy to host many different websites on the same machine, even across different domains!

	```
	sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
	sudo apt update
	sudo apt install caddy
	```

- Installing Caddy creates a systemd service that will boot up the server on startup.

	You can start and stop Caddy and look at logs all through systemd commands.

	```sh
	systemctl start caddy
	systemctl status caddy

	# show more logs
	systemctl status caddy -n 100

	# print all logs
	journalctl -u caddy
	# print all logs in reverse order
	journalctl -u caddy -r
	```

- Edit your Caddyfile at `/etc/caddy/Caddyfile` to point your domain to the port the app is running on.

	```
	example.com {
		reverse_proxy localhost:8080
	}

	www.example.com {
		redir https://example.com{uri}
	}
	```

	Any time you edit your Caddyfile, you'll need to reload Caddy.

	```sh
	caddy reload
	```

You'll want to go into `ServerConfig.ts` too and update the domain from `example.com` to whatever you're domain is.

You'll also want to make sure your app starts whenever the server restarts – we can do this using systemd.

- To run your app on startup with systemd.

	```sh
	npm install -g add-to-systemd
	add-to-systemd example-app --env "NODE_ENV=production" "$(which npm) start"

	systemctl start example-app
	systemctl status example-app

	# check that it is serving
	curl https://localhost:8080
	```

Cool. Now when you restart your server, you should notice that everything boots up.

If you check your Caddy logs, you should see that an SSL certificate was issued from LetsEncrypt.

Go to your domain and you should see your app running!

## Updating

Deploying an update is really simple – you just need to stop the app, pull changes, and boot it back up!

```sh
systemctl stop example-app
git pull origin master
npm install
# Run a migration script if you need to.
systemctl start example-app
```

It's not a zero-downtime deploy, but it's only a couple seconds of downtime. And since the app works offline, users should hardly notice. You can worry about zero-downtime deploys once you scale up.
