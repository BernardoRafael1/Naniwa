import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/Auth/LoginPage";
import { RegisterPage } from "../pages/Auth/RegisterPage";
import { HomePage } from "../pages/Home/HomePage";
import { MangaDetailsPage } from "../pages/MangaDetails/MangaDetailsPage";
import { ReaderPage } from "../pages/Reader/ReaderPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/manga/:mangaId" element={<MangaDetailsPage />} />
      <Route path="/manga/:mangaId/reader/:chapterId" element={<ReaderPage />} />

      <Route path="/reader/:chapterId" element={<ReaderPage />} />
    </Routes>
  );
}