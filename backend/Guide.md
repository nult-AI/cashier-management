# How to run:
- uv run uvicorn app.main:app --reload


# Azure Steps:
1. Login Azure CLI: az login
2. Set subscription: az account set --subscription "name-or-id"

+ Khi run: terraform apply bị issue về đăng ký Microsoft.App thì chạy command sau:
- az provider register --namespace Microsoft.App
- az provider show --namespace Microsoft.App --query "registrationState" # check status: registering or registered

3. Login to ACR: az acr login --name acrnultcashiertest
4. Build image: docker build -t acrnultcashiertest.azurecr.io/nult-cashier-backend:v1 .
5. Push image: docker push acrnultcashiertest.azurecr.io/nult-cashier-backend:v1
