from pydantic import BaseModel
from datetime import datetime


class DashboardStats(BaseModel):
    total_revenue: float
    total_orders: int
    total_customers: int
    total_products: int
    revenue_change: float
    orders_change: float
    customers_change: float


class DashboardMonthly(BaseModel):
    label: str
    value: float


class DashboardTopProduct(BaseModel):
    name: str
    sold: int
    revenue: float


class AdminDashboard(BaseModel):
    stats: DashboardStats
    monthly_revenue: list[DashboardMonthly]
    top_products: list[DashboardTopProduct]
    recent_orders: list
