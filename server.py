from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove
import io

app = FastAPI()

# CORS 설정 (React 연동을 위해 필수)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    input_image = await file.read()
    output_image = remove(input_image)
    return Response(content=output_image, media_type="image/png")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
