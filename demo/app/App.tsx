import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { FileListPage } from "./components/file-browser/FileListPage";
import { PresentationPage } from "./components/presentation/PresentationPage";
import { PlayerPage } from "./components/slide-player/PlayerPage";
import { SlideshowPage } from "./components/slideshow/SlideshowPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app with layout */}
        <Route element={<Layout />}>
          <Route index element={<FileListPage />} />
          <Route path="view/:fileId" element={<PresentationPage />} />
          <Route path="play/:fileId/:slideNum" element={<PlayerPage />} />
        </Route>

        {/* Slideshow - full screen, no layout */}
        <Route path="slideshow/:fileId" element={<SlideshowPage />} />
      </Routes>
    </BrowserRouter>
  );
}
