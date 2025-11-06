import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";
import { useContext, useEffect } from "react";

export function usePrompt(message, when = true) {
  const navigator = useContext(NavigationContext).navigator;

  useEffect(() => {
    if (!when) return;

    const push = navigator.push;
    const replace = navigator.replace;

    navigator.push = (...args) => {
      if (window.confirm(message)) {
        push.apply(navigator, args);
      }
    };

    navigator.replace = (...args) => {
      if (window.confirm(message)) {
        replace.apply(navigator, args);
      }
    };

    return () => {
      navigator.push = push;
      navigator.replace = replace;
    };
  }, [message, when, navigator]);
}
