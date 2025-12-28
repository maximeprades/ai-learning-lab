import { usePrecisionRecall } from "@/lib/stores/usePrecisionRecall";
import { WelcomeScreen } from "@/components/game/WelcomeScreen";
import { GameScreen } from "@/components/game/GameScreen";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { ResultsScreen } from "@/components/game/ResultsScreen";

export default function PrecisionRecallGame() {
  const { phase } = usePrecisionRecall();

  return (
    <>
      {phase === "welcome" && <WelcomeScreen />}
      {phase === "playing" && <GameScreen />}
      {phase === "feedback" && <FeedbackScreen />}
      {phase === "results" && <ResultsScreen />}
    </>
  );
}
