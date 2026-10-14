#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "LottoGameMode.generated.h"

UCLASS()
class KSMSLOTTO_API ALottoGameMode : public AGameModeBase
{
	GENERATED_BODY()
public:
	UFUNCTION(BlueprintCallable, Category = "Venus")
	static TArray<int32> DrawNumbers();

	UFUNCTION(BlueprintCallable, Category = "Venus")
	void StartDraw(class AVenusMachine* Machine);
};
