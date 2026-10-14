#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "VenusMachine.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBallCaptured, int32, BallNumber);

// 비너스 본체: 80x80x220cm, 혼합구 r=25cm, 터빈 바람 + 상단 캡처존
UCLASS()
class KSMSLOTTO_API AVenusMachine : public AActor
{
	GENERATED_BODY()
public:
	AVenusMachine();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Venus")
	class UStaticMeshComponent* Body;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Venus")
	class UStaticMeshComponent* MixingChamber;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Venus")
	class USphereComponent* CaptureZone; // 상단 추출 위치

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Venus|Wind")
	float WindStrength = 55.0f; // 터빈 세기 (질량 5g 기준 튜닝)

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Venus|Wind")
	float Turbulence = 18.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Venus")
	bool bMixing = false;

	UPROPERTY(BlueprintAssignable, Category = "Venus")
	FOnBallCaptured OnBallCaptured;

	// 사전 추첨된 번호만 잡히게 할 때 사용. 비어있으면 PurePhysics.
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Venus")
	TArray<int32> AllowedCaptureOrder;

	int32 CaptureIndex = 0;

	UFUNCTION(BlueprintCallable, Category = "Venus")
	void StartMixing();

	UFUNCTION(BlueprintCallable, Category = "Venus")
	void StopMixing();

	UFUNCTION(BlueprintCallable, Category = "Venus")
	void ResetCapture() { CaptureIndex = 0; AllowedCaptureOrder.Empty(); }

protected:
	virtual void Tick(float DeltaTime) override;

private:
	void ApplyWindToBalls(float DeltaTime);
};
