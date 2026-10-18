import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

// TDS 컴포넌트를 쓰지 않아서 TDS Provider 를 뺐어요 (번들 1.3MB → 가볍게, 첫 화면이 빨리 떠요)
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
