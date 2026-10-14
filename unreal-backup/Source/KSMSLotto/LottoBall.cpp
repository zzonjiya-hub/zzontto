#include "LottoBall.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"

ALottoBall::ALottoBall()
{
	PrimaryActorTick.bCanEverTick = false;

	Sphere = CreateDefaultSubobject<USphereComponent>(TEXT("Sphere"));
	RootComponent = Sphere;
	Sphere->InitSphereRadius(2.0f); // 40mm diameter (cm 단위: r=2cm)
	Sphere->SetSimulatePhysics(true);
	Sphere->SetEnableGravity(true);
	Sphere->SetMassOverrideInKg(NAME_None, 0.005f); // 5g 탁구공 가정
	Sphere->SetPhysMaterialOverride(nullptr);
	Sphere->SetLinearDamping(0.15f);
	Sphere->SetAngularDamping(0.1f);

	Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	Mesh->SetupAttachment(Sphere);
	Mesh->SetSimulatePhysics(false);
	Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void ALottoBall::SetBallNumber(int32 InNumber)
{
	BallNumber = FMath::Clamp(InNumber, 1, 45);
	// TODO: 번호별 머티리얼/데칼 교체 (M_Ball_01~45 또는 Dynamic TextRender)
}

void ALottoBall::Capture()
{
	bIsCaptured = true;
	Sphere->SetSimulatePhysics(false);
	Sphere->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void ALottoBall::ReleaseToChamber(const FVector& SpawnPos)
{
	bIsCaptured = false;
	SetActorLocation(SpawnPos);
	Sphere->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
	Sphere->SetSimulatePhysics(true);
}
