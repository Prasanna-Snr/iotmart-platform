from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class TutorialCategoryCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    icon: str = ""


class TutorialCategoryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str
    icon: str
    model_config = {"from_attributes": True}


class TutorialCreate(BaseModel):
    title: str
    slug: str
    description: str = ""
    short_description: str = ""
    difficulty: str = "Beginner"
    estimated_time: str = ""
    components: list[str] = []
    sensors: list[str] = []
    microcontrollers: list[str] = []
    circuit_diagram: str | None = None
    wiring_instructions: list[dict] = []
    source_code: str = ""
    code_language: str = "cpp"
    steps: list[dict] = []
    prerequisites: list[str] = []
    learning_outcomes: list[str] = []
    related_product_ids: list[str] = []
    related_tutorial_ids: list[str] = []
    cover_image: str = ""
    featured: bool = False
    published: bool = False
    author: str = ""
    tags: list[str] = []
    category_id: UUID


class TutorialUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    short_description: str | None = None
    difficulty: str | None = None
    steps: list[dict] | None = None
    source_code: str | None = None
    featured: bool | None = None
    published: bool | None = None
    cover_image: str | None = None
    tags: list[str] | None = None


class TutorialOut(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str
    short_description: str
    difficulty: str
    estimated_time: str
    components: list
    sensors: list
    microcontrollers: list
    circuit_diagram: str | None = None
    wiring_instructions: list
    source_code: str
    code_language: str
    steps: list
    prerequisites: list
    learning_outcomes: list
    related_product_ids: list
    related_tutorial_ids: list
    cover_image: str
    views: int
    featured: bool
    published: bool
    author: str
    tags: list
    category: TutorialCategoryOut | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TutorialListOut(BaseModel):
    items: list[TutorialOut]
    total: int
    page: int
    page_size: int
