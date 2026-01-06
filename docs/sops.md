---
title: Securing Secrets the Easy Way, Keep your API Keys Safe from the Public Eye

---
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Giscus from "@giscus/react";
import Figure from '../src/components/Figure';

Haha, I really don't want you all to be like my buddy who has his API keys, Redis creds, and Slack hooks sitting plain as ``config.yaml``, committed to GitHub, and the server deployed on a public subnet where any random internet user could find it, ssh into the server, with a simple ``ls`` and ``cat``, you had see it all. You don’t want that, trust me.

So how do we then go about it all? we would use **SOPS**, yeah you heard me right, **SOPS is a Simple And Flexible Tool For Managing Secrets**

SOPS is an editor of encrypted files that supports YAML, JSON, ENV, INI and BINARY formats and encrypts with AWS KMS, GCP KMS, Azure Key Vault, age, and PGP

So how will this be helping us?, it means you can encrypt your secrets env files load it encrypted, decrypt it within your codebase and access it via runtime, you get?

In this post, we'll use age for encryption. age is simple — it generates a private and public key. You encrypt with the public key and decrypt with your private key, meaning you’re in charge of keeping your private key safe.

For production apps, though, I’d recommend using services like AWS KMS, Azure Key Vault, or HashiCorp Vault. You can check out the official <a href="https://getsops.io/docs/" target="_blank">docs</a>


If you are using MacOSX, just run ``brew install sops age``, this will install SOPS and age/age-keygen on your environment

Then create a folder with the following commands

```
mkdir -p ~/.config/sops/age
```

And run ```age-keygen -o ~/.config/sops/age/keys.txt``` to generate the private, public key save to the ~/.config/sops/age/keys.txt file, should look like this

then when you read out the file content, it should look like this

<img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/agekeygen.png`} alt="Chill"/>


```
cat ~/.config/sops/age/keys.txt
```

<img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/catage.png`} alt="Chill"/>


Now lets encrypt the env files, running

```
sops --encrypt --age age18es975c59fpgk2mwllxnds92tt5hykhp9akhukxypge7yyuw6v7sh3cutl ./config/goexample.dev.yaml > goexample.dev.enc.yaml
```

Replace ``age18es975c59fpgk2mwllxnds92tt5hykhp9akhukxypge7yyuw6v7sh3cutl`` with your own public key, you can replace the ./config/goexample.dev.yaml with your own env file or config file, e.g .env.dev or more

Your output file should look just like this

<img src={`${useDocusaurusContext().siteConfig.customFields.imgurl}/bgimg/encryptlook.png`} alt="Chill"/>


now that we have our encypted file, without loosing or exposing our private key, there is peace of mind of commiting or even leaving our encrypted secret file exposed or laying as a file in our servers, haha.

So now you need to decrypt and access your secret, i prefer doing this in runtime, so let me share with you a Go based example, you can always replicate it based on whatever language you might be using.


```Go
package config

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"

	"github.com/spf13/viper"
)

// Config defines the structure of the application configuration
type Config struct {
	PaymentService struct {
		APIKey string `mapstructure:"api_key"`
		URL    string `mapstructure:"url"`
	} `mapstructure:"payment_service"`
	Server struct {
		Port string `mapstructure:"port"`
	} `mapstructure:"server"`
}

func LoadConfig() (*Config, error) {
	// Define the encrypted configuration file path
	encryptedFilePath := "./goexample.dev.enc.yaml"
	// Your AGE secret key
	ageKey := os.Getenv("SOPS_AGE_KEY")
	if ageKey == "" {
		fmt.Println("SOPS_AGE_KEY environment variable is not set")
		os.Exit(1)
	}

	// Use SOPS to decrypt the file directly
	cmd := exec.Command("sops", "--decrypt", encryptedFilePath) // Provide the file path directly

	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = os.Stderr // Capture any error messages

	// Run the decryption command
	if err := cmd.Run(); err != nil {
		exitCode := cmd.ProcessState.ExitCode()
		fmt.Printf("Failed to decrypt config: %v (exit code: %d)\n", err, exitCode)
		os.Exit(1)
	}

	// Load the decrypted YAML/JSON into Viper
	viper.SetConfigType("yaml") // or "json", depending on the decrypted format
	if err := viper.ReadConfig(bytes.NewBuffer(out.Bytes())); err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	// Unmarshal the configuration into the Config struct
	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}
```

And thats it, but now you get to manage your private key 😂, so this example is good for development teams, you get? but for production, just use AWS KMS, Hashicorp Vault, GCP KMS or even Azure Vault.

Also if you happen to be deploying your applications in AWS? use leverage the AWS Parameter store for your application, access secrets via runtime using AWS SDK, There are Assumable roles, serviceaccounts and more.

Thats it folks 🤞🏽

*Written with vibes and insha Allah from somewhere in this Lagos traffic 😮‍💨*

<br/>
<h2>Comments</h2>
<Giscus
id="comments"
repo="saintmalik/blog.saintmalik.me"
repoId="MDEwOlJlcG9zaXRvcnkzOTE0MzQyOTI="
category="General"
categoryId="DIC_kwDOF1TQNM4CQ8lN"
mapping="title"
term="Comments"
reactionsEnabled="1"
emitMetadata="0"
inputPosition="top"
theme="preferred_color_scheme"
lang="en"
loading="lazy"
crossorigin="anonymous"
    />