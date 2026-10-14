#include "LottoGameMode.h"
#include "VenusMachine.h"

TArray<int32> ALottoGameMode::DrawNumbers()
{
	TArray<int32> Pool;
	for (int32 i = 1; i <= 45; ++i) Pool.Add(i);
	TArray<int32> Pick;
	for (int32 i = 0; i < 7; ++i)
	{
		int32 Idx = FMath::RandRange(0, Pool.Num() - 1);
		Pick.Add(Pool[Idx]);
		Pool.RemoveAt(Idx);
	}
	// 앞 6개 정렬 + 보너스 1개 (실제 방송 방식)
	TArray<int32> First6;
	for (int32 i = 0; i < 6; ++i) First6.Add(Pick[i]);
	First6.Sort();
	TArray<int32> Result = First6;
	Result.Add(Pick[6]); // 보너스
	return Result;
}

void ALottoGameMode::StartDraw(AVenusMachine* Machine)
{
	if (!Machine) return;
	TArray<int32> Pool;
	for (int32 i = 1; i <= 45; ++i) Pool.Add(i);
	TArray<int32> Pick;
	for (int32 i = 0; i < 7; ++i)
	{
		int32 Idx = FMath::RandRange(0, Pool.Num() - 1);
		Pick.Add(Pool[Idx]);
		Pool.RemoveAt(Idx);
	}
	Machine->ResetCapture();
	Machine->AllowedCaptureOrder = Pick; // 6개+보너스 순서대로 캡처됨
	Machine->StartMixing();
}
