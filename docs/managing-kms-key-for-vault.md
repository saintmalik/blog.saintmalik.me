<!-- terraform state rm vault_kv_secret_v2.messaging-pod
terraform state rm vault_kv_secret_v2.posts-pod
terraform state rm vault_kv_secret_v2.nooks-pod
terraform state rm vault_kv_secret_v2.firebase-sa
terraform state rm vault_kv_secret_v2.payment-pod
terraform state rm vault_kv_secret_v2.notifications-pod
terraform state rm vault_kv_secret_v2.books-pod
terraform state rm vault_kv_secret_v2.auth-pod
terraform state rm vault_kv_secret_v2.clubs-pod
terraform state rm vault_kubernetes_auth_backend_role.microsvc-role
terraform state rm vault_mount.kvv2
terraform state rm vault_policy.micro-svc
terraform state rm vault_auth_backend.kubernetes
terraform state rm vault_kubernetes_auth_backend_config.config


Error: failed to replace object: Service terraform

  recreate_pods     = false
  reuse_values      = true
  force_update      = false -->