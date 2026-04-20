from pydantic import BaseModel


class LabelCount(BaseModel):
    label: str
    count: int


class LabelAvg(BaseModel):
    label: str
    avg: float


class SectorStats(BaseModel):
    name: str
    count: int
    avgSalary: float
    avgMale: float
    avgFemale: float


class GenderGapSector(BaseModel):
    name: str
    avgMale: float
    avgFemale: float
    gap: float


class TopPosition(BaseModel):
    name: str
    count: int
    avgSalary: float


class SeniorityWithSalary(BaseModel):
    label: str
    avg: float
    count: int


class BrutoNetoRange(BaseModel):
    label: str
    avgBruto: float
    avgNeto: float
    count: int


class DashboardStats(BaseModel):
    totalServidores: int
    totalSectors: int
    avgSalary: float
    medianSalary: float
    minSalary: float
    maxSalary: float
    p25: float
    p50: float
    p75: float
    p90: float
    genderGapPercent: float
    hombres: int
    mujeres: int
    avgSalaryMale: float
    avgSalaryFemale: float
    salaryDistribution: list[LabelCount]
    ageDistribution: list[LabelCount]
    contractTypes: list[LabelCount]
    personalTypes: list[LabelCount]
    salaryByAge: list[LabelAvg]
    top15Sectors: list[SectorStats]
    allSectors: list[SectorStats]
    genderGapBySector: list[GenderGapSector]
    topPositions: list[TopPosition]
    seniorityDistribution: list[LabelCount]
    salaryBySeniority: list[SeniorityWithSalary]
    avgSeniority: float
    avgNetSalary: float
    avgDeduction: float
    avgDeductionPercent: float
    brutoNetoByRange: list[BrutoNetoRange]
