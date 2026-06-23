import { Route, Routes } from "react-router-dom";
import { HomePage } from "../pages/Home/HomePage";
import { MangaDetailsPage } from "../pages/MangaDetails/MangaDetailsPage";
import { ReaderPage } from "../pages/Reader/ReaderPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/manga/:mangaId" element={<MangaDetailsPage />} />
      <Route path="/reader/:chapterId" element={<ReaderPage />} />
    </Routes>
  );
}