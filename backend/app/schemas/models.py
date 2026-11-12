from typing import Annotated, Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, StringConstraints, field_validator

EmailAddress = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=5,
        max_length=120,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    ),
]


class LoginRequest(BaseModel):
    email: EmailAddress
    password: str = Field(..., min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailAddress
    password: str = Field(..., min_length=8, max_length=128)
    phone: Optional[str] = Field(default=None, max_length=24)


class ForgotPasswordRequest(BaseModel):
    email: EmailAddress


class ResetPasswordRequest(BaseModel):
    email: EmailAddress
    verification_code: str = Field(..., min_length=4, max_length=12)
    new_password: str = Field(..., min_length=8, max_length=128)


class CartItemCreateRequest(BaseModel):
    product_id: str = Field(..., min_length=3)
    quantity: int = Field(default=1, ge=1, le=20)


class CartItemUpdateRequest(BaseModel):
    quantity: int = Field(..., ge=0, le=20)


class WishlistAddRequest(BaseModel):
    product_id: str = Field(..., min_length=3)


class AddressCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=80)
    phone: str = Field(..., min_length=7, max_length=24)
    line1: str = Field(..., min_length=5, max_length=160)
    line2: Optional[str] = Field(default="", max_length=160)
    city: str = Field(..., min_length=2, max_length=80)
    state: str = Field(..., min_length=2, max_length=80)
    postal_code: str = Field(..., min_length=4, max_length=20)
    country: str = Field(default="United States", min_length=2, max_length=80)
    is_default: bool = False


class OrderCreateRequest(BaseModel):
    address_id: str = Field(..., min_length=3)
    payment_method: Literal["SIMULATED_CARD", "SIMULATED_UPI", "SIMULATED_NETBANKING"] = (
        "SIMULATED_CARD"
    )
    idempotency_key: str = Field(..., min_length=6, max_length=100)


class OrderCancelRequest(BaseModel):
    reason: str = Field(default="Customer requested cancellation", max_length=300)


class ReviewCreateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=3, max_length=120)
    comment: str = Field(..., min_length=10, max_length=1500)


class CompareProductsRequest(BaseModel):
    product_ids: List[str] = Field(..., min_length=2, max_length=4)


class AdminProductCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=140)
    sku: str = Field(..., min_length=3, max_length=40)
    brand: str = Field(..., min_length=2, max_length=60)
    category_id: str = Field(..., min_length=3)
    short_description: str = Field(..., min_length=10, max_length=300)
    description: str = Field(..., min_length=20, max_length=4000)
    price: float = Field(..., gt=0, le=100000)
    discount_percent: float = Field(default=0, ge=0, le=80)
    images: List[str] = Field(..., min_length=1)
    specifications: Dict[str, Any] = Field(default_factory=dict)
    warranty_info: str = Field(default="2-Year Authorized Manufacturer Warranty", max_length=300)
    in_the_box: List[str] = Field(default_factory=list)
    compatible_product_ids: List[str] = Field(default_factory=list)
    lens_mount: Optional[str] = None
    is_featured: bool = False
    is_new_arrival: bool = False
    is_best_seller: bool = False
    initial_stock: int = Field(default=15, ge=0, le=10000)
    low_stock_threshold: int = Field(default=5, ge=1, le=500)

    @field_validator("price")
    @classmethod
    def round_price(cls, v: float) -> float:
        return round(v, 2)


class AdminProductUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=3, max_length=140)
    brand: Optional[str] = Field(default=None, min_length=2, max_length=60)
    category_id: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0, le=100000)
    discount_percent: Optional[float] = Field(default=None, ge=0, le=80)
    images: Optional[List[str]] = None
    specifications: Optional[Dict[str, Any]] = None
    warranty_info: Optional[str] = None
    in_the_box: Optional[List[str]] = None
    compatible_product_ids: Optional[List[str]] = None
    lens_mount: Optional[str] = None
    is_featured: Optional[bool] = None
    is_new_arrival: Optional[bool] = None
    is_best_seller: Optional[bool] = None
    catalog_status: Optional[Literal["ACTIVE", "INACTIVE"]] = None


class PresignedUploadRequest(BaseModel):
    filename: str = Field(..., min_length=3, max_length=120)
    content_type: str = Field(..., min_length=5, max_length=50)
    file_size_bytes: int = Field(..., gt=0)


class AdminOrderStatusUpdateRequest(BaseModel):
    status: Literal[
        "Placed", "Confirmed", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"
    ]
    note: Optional[str] = Field(default=None, max_length=300)


class AdminStockAdjustRequest(BaseModel):
    delta: int = Field(..., ge=-5000, le=5000)
    reason: str = Field(..., min_length=3, max_length=250)
    low_stock_threshold: Optional[int] = Field(default=None, ge=1, le=500)


class AdminCustomerStatusRequest(BaseModel):
    status: Literal["ACTIVE", "SUSPENDED"]

