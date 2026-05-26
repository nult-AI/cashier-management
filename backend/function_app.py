import azure.functions as func
import nest_asyncio
from app.main import app as fastapi_app # Import biến app FastAPI từ file main.py của bạn

# Sửa lỗi bất đồng bộ vòng lặp của Azure và FastAPI
nest_asyncio.apply()

# Khởi tạo Azure Function App với chế độ HTTP Asgi
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Bọc toàn bộ các route của FastAPI
@app.route(route="{*route}", auth_level=func.AuthLevel.ANONYMOUS)
async def fastapi_asgi_wrapper(req: func.HttpRequest, context: func.Context) -> func.HttpResponse:
    # Chuyển đổi request từ Azure sang chuẩn ASGI để FastAPI xử lý
    return await func.AsgiMiddleware(fastapi_app).handle_async(req, context)