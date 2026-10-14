#include "VenusMachine.h"
#include "LottoBall.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SphereComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/World.h"

AVenusMachine::AVenusMachine()
{
	PrimaryActorTick.bCanEverTick = true;

	Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Body"));
	RootComponent = Body;

	MixingChamber = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("MixingChamber"));
	MixingChamber->SetupAttachment(RootComponent);

	CaptureZone = CreateDefaultSubobject<USphereComponent>(TEXT("CaptureZone"));
	CaptureZone->SetupAttachment(RootComponent);
	CaptureZone->InitSphereRadius(4.0f);
	CaptureZone->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	CaptureZone->SetCollisionResponseToAllChannels(ECR_Overlap);
}

void AVenusMachine::StartMixing() { bMixing = true; }
void AVenusMachine::StopMixing() { bMixing = false; }

void AVenusMachine::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
	if (bMixing) ApplyWindToBalls(DeltaTime);

	// 캡처 체크
	TArray<AActor*> Overlapping;
	CaptureZone->GetOverlappingActors(Overlapping, ALottoBall::StaticClass());
	for (AActor* A : Overlapping)
	{
		ALottoBall* Ball = Cast<ALottoBall>(A);
		if (!Ball || Ball->bIsCaptured) continue;
		if (CaptureIndex >= 7) break;

		// PreDraw 모드: 순서에 맞는 번호만 캡처
		if (AllowedCaptureOrder.Num() == 7)
		{
			if (Ball->BallNumber != AllowedCaptureOrder[CaptureIndex]) continue;
		}
		Ball->Capture();
		OnBallCaptured.Broadcast(Ball->BallNumber);
		CaptureIndex++;

		// TODO: 전시대(DisplayTube) 위치로 애니메이션 이동
		if (CaptureIndex >= 7) StopMixing();
		break; // 한 틱에 1개씩만
	}
}

void AVenusMachine::ApplyWindToBalls(float DeltaTime)
{
	const FVector Center = MixingChamber->GetComponentLocation();
	const float Time = GetWorld()->GetTimeSeconds();

	TArray<AActor*> Balls;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), ALottoBall::StaticClass(), Balls);
	for (AActor* A : Balls)
	{
		ALottoBall* Ball = Cast<ALottoBall>(A);
		if (!Ball || Ball->bIsCaptured) continue;
		USphereComponent* S = Ball->Sphere;
		if (!S || !S->IsSimulatingPhysics()) continue;

		FVector ToBall = Ball->GetActorLocation() - Center;
		// 아래에서 위로 + 소용돌이 + 난류
		FVector Up(0, 0, WindStrength);
		FVector Swirl(-ToBall.Y, ToBall.X, 0.0f);
		Swirl.Normalize(0.0001f);
		Swirl *= WindStrength * 0.35f;
		FVector Noise(
			FMath::Sin(Time * 7.3f + Ball->BallNumber * 1.7f) * Turbulence,
			FMath::Cos(Time * 6.1f + Ball->BallNumber * 2.3f) * Turbulence,
			FMath::Sin(Time * 9.7f + Ball->BallNumber) * Turbulence * 0.5f);

		S->AddForce(Up + Swirl + Noise, NAME_None, true);
	}
}
