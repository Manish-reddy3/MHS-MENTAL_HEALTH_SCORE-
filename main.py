import joblib
from pydantic import BaseModel,Field
from fastapi import FastAPI
import pandas as pd
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

#Lets apply validations
# Pydantic model

class Student(BaseModel):
    Age: int = Field(...,ge=10,le=100, description="Age must be between 10 and 100")
    Gender: Literal["Male", "Female"]
    Country: str
    Academic_Level: Literal['Undergraduate', 'Graduate', 'High School']
    Most_Used_Platform: Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter',
       'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp',
       'WeChat']
    Purpose_Of_Use: Literal['Networking', 'Education', 'Entertainment', 'News']
    Avg_Daily_Usage_Hours: float = Field(...,ge=0,le=24, description="Average daily usage hours must be between 0 and 24")    
    Daily_Unlocks: float = Field(...,ge=0,le=1000, description="Daily unlocks must be between 0 and 1000")
    Study_Hours: float = Field(...,ge=0,le=24, description="Study hours must be between 0 and 24")
    Physical_Activity_Hours:float = Field(...,ge=0,le=24, description="Physical activity hours must be between 0 and 24")
    Sleep_Hours_Per_Night: float = Field(...,ge=0,le=24, description="Sleep hours per night must be between 0 and 24")
    Stress_Level: Literal['Medium', 'Low', 'Very High', 'High']


# Load model
try:
    model = joblib.load("ML-1.pkl")
    print("SUCCESS")
    print(type(model))

except Exception as e:
    print("\nERROR TYPE:", type(e).__name__)
    print("ERROR:", e)


@app.get("/")
def greet():
    return {"message": "Hello, World!"}


# Top countries
top_countries = [
    'Other',
    'India',
    'USA',
    'Canada',
    'Australia',
    'UK',
    'Germany',
    'Mexico',
    'Turkey',
    'France'
]


# Describe what we send back to the user server process and send response back to the user response body
class Predict_Response(BaseModel):
    predicted_class: float









# Prediction endpoint
@app.post("/predict",response_model=Predict_Response)
def predict(data: Student):

    # FEATURE ENGINEERING
    country_group = (
        data.Country
        if data.Country in top_countries
        else 'Other'
    )

    # CREATE INPUT DATAFRAME
    input_row = pd.DataFrame([{
        'Age': data.Age,
        'Gender': data.Gender,
        'Country': data.Country,
        'Academic_Level': data.Academic_Level,
        'Most_Used_Platform': data.Most_Used_Platform,
        'Purpose_Of_Use': data.Purpose_Of_Use,
        'Avg_Daily_Usage_Hours': data.Avg_Daily_Usage_Hours,
        'Daily_Unlocks': data.Daily_Unlocks,
        'Study_Hours': data.Study_Hours,
        'Physical_Activity_Hours': data.Physical_Activity_Hours,
        'Sleep_Hours_Per_Night': data.Sleep_Hours_Per_Night,
        'Stress_Level': data.Stress_Level,
        'Grouped': country_group
    }])

    # PREDICTION
    prediction = model.predict(input_row)[0]

    return Predict_Response(predicted_class=prediction)