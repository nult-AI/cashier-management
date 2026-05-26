terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Variable để tránh lộ mật khẩu cơ sở dữ liệu
variable "database_url" {
  type        = string
  description = "Supabase PostgreSQL Database connection string"
  sensitive   = true
}

# 1. Tạo Resource Group chung để dễ dọn dẹp
resource "azurerm_resource_group" "rg" {
  name     = "rg-nult-cashier-test"
  location = "East Asia" # Chọn Singapore để ping về Việt Nam thấp nhất
}

# 2. Tạo kho lưu trữ Docker Image (Azure Container Registry)
resource "azurerm_container_registry" "acr" {
  name                = "acrnultcashiertest"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic" # Gói Basic rất rẻ, phù hợp để dev/test
  admin_enabled       = true
}

# 3. Tạo môi trường thực thi (Container Apps Environment)
resource "azurerm_container_app_environment" "env" {
  name               = "cae-nult-cashier"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# 4. Triển khai Container App (Backend Python của anh)
resource "azurerm_container_app" "app" {
  name                         = "ca-nult-cashier-backend"
  resource_group_name          = azurerm_resource_group.rg.name
  container_app_environment_id = azurerm_container_app_environment.env.id
  revision_mode                = "Single"

  # Cấu hình thông tin xác thực để Azure Container App có quyền truy cập vào kho ACR lấy ảnh
  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "database-url"
    value = var.database_url
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  template {
    container {
      name   = "python-backend"
      #image  = "mcr.microsoft.com/azuredocs/aci-helloworld:latest" # Chạy ảnh test mẫu trước, sau này anh thay bằng ảnh trong ACR của anh
      image  = "acrnultcashiertest.azurecr.io/nult-cashier-backend:v1"
      cpu    = "0.25"
      memory = "0.5Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name  = "DATABASE_SCHEMA"
        value = "cashier_app"
      }
    }
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 7860 # Đã đổi thành port chạy API Python của bạn (7860 theo Dockerfile)
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# 5. Output ra link URL công khai để anh gọi API từ POS/Frontend
output "backend_url" {
  value = azurerm_container_app.app.ingress[0].fqdn
}

# Output thêm thông tin Login Server của ACR để anh dùng ở bước sau
output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}