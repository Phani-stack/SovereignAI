from typing import Optional, List
from fastapi import APIRouter, Header, HTTPException, Depends
from pydantic import BaseModel
from backend.core.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "User"
    abilities: Optional[List[str]] = None
    allowed_documents: Optional[List[str]] = None
    allowed_folders: Optional[List[str]] = None


class UpdateAbilitiesRequest(BaseModel):
    abilities: Optional[List[str]] = None
    allowed_documents: Optional[List[str]] = None
    allowed_folders: Optional[List[str]] = None
    role: Optional[str] = None


def get_current_user_from_header(
    x_user_token: Optional[str] = Header(None, alias="X-User-Token"),
    authorization: Optional[str] = Header(None),
):
    token = x_user_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization

    if not token:
        # Fallback for dev / unauthenticated requests -> return default admin user
        return auth_service.get_user_by_token("admin_token")

    user = auth_service.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    return user


def require_admin(current_user: dict = Depends(get_current_user_from_header)):
    if not auth_service.has_ability(current_user, "can_manage_users"):
        raise HTTPException(
            status_code=403, detail="Administrator permission ('can_manage_users') required"
        )
    return current_user


@router.post("/login")
async def login(req: LoginRequest):
    token, result = auth_service.authenticate_user(req.username, req.password)
    if not token:
        raise HTTPException(status_code=400, detail=result)
    return {"token": token, "user": result}


@router.post("/logout")
async def logout(
    x_user_token: Optional[str] = Header(None, alias="X-User-Token"),
):
    if x_user_token and x_user_token in auth_service.SESSIONS:
        del auth_service.SESSIONS[x_user_token]
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user_from_header)):
    return {"user": user}


@router.get("/users")
async def list_users(admin: dict = Depends(require_admin)):
    return {"users": auth_service.list_all_users()}


@router.post("/users")
async def create_user_endpoint(
    req: CreateUserRequest, admin: dict = Depends(require_admin)
):
    try:
        user = auth_service.create_user(
            username=req.username,
            password=req.password,
            role=req.role,
            abilities=req.abilities,
            allowed_documents=req.allowed_documents,
            allowed_folders=req.allowed_folders,
        )
        return {"message": "User created successfully", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{username}/abilities")
async def update_user_abilities_endpoint(
    username: str, req: UpdateAbilitiesRequest, admin: dict = Depends(require_admin)
):
    try:
        updated = auth_service.update_user_abilities(
            username=username,
            abilities=req.abilities,
            allowed_documents=req.allowed_documents,
            allowed_folders=req.allowed_folders,
            role=req.role,
        )
        return {"message": "User abilities updated successfully", "user": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/users/{username}")
async def delete_user_endpoint(username: str, admin: dict = Depends(require_admin)):
    try:
        success = auth_service.delete_user(username)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": f"User '{username}' deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
