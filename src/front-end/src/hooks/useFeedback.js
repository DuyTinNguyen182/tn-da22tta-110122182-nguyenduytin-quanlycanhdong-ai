import { useContext } from "react";
import { FeedbackContext } from "../context/FeedbackContext";

export const useFeedback = () => {
  const value = useContext(FeedbackContext);

  if (!value) {
    throw new Error("useFeedback must be used inside FeedbackProvider");
  }

  return value;
};
