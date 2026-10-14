#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LottoBall.generated.h"

// 비너스 추첨볼 1개. 실제 지름 약 40mm, 초경량 가정.
UCLASS()
class KSMSLOTTO_API ALottoBall : public AActor
{
	GENERATED_BODY()
public:
	ALottoBall();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Venus")
	class USphereComponent* Sphere;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Venus")
	class UStaticMeshComponent* Mesh;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Venus")
	int32 BallNumber = 1;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Venus")
	bool bIsCaptured = false;

	UFUNCTION(BlueprintCallable, Category = "Venus")
	void SetBallNumber(int32 InNumber);

	UFUNCTION(BlueprintCallable, Category = "Venus")
	void Capture();

	UFUNCTION(BlueprintCallable, Category = "Venus")
	void ReleaseToChamber(const FVector& SpawnPos);
};
