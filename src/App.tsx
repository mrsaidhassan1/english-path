import { useOnlineSync } from './hooks/useOnlineSync';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from './store';
import { Layout } from './components/Layout';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import MyLearning from './pages/MyLearning';
import { LessonsPage, ModulePage } from './pages/Lessons';
import LessonPlayer from './pages/LessonPlayer';
import Vocabulary from './pages/Vocabulary';
import { SpeakingPage, RolePlayPage } from './pages/Speaking';
import { PracticePage, GrammarBooster, ReviewPage } from './pages/Practice';
import { ExamsPage, ExamRunner } from './pages/Exams';
import { ProgressPage, CertificatePage } from './pages/Progress';
import Teacher from './pages/Teacher';
import StudentReport from './pages/StudentReport';
import Classroom from './pages/Classroom';
import { EmptyState, LinkButton } from './components/ui';
import { ConfirmHost } from './components/Confirm';

function TeacherOnly({ children }: { children: ReactNode }) {
  const { isTeacher } = useApp();
  return isTeacher ? <>{children}</> : <EmptyState icon="🔒" title="Teacher area" text="Please ask your teacher to open this page." action={<LinkButton to="/">Home</LinkButton>} />;
}

function Shell() {
  const { data } = useApp();
  useOnlineSync();
  if (!data.session.role) return <Welcome />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/learning" element={<MyLearning />} />
        <Route path="/lessons" element={<LessonsPage />} />
        <Route path="/lessons/:moduleId" element={<ModulePage />} />
        <Route path="/lessons/:moduleId/:lessonId" element={<LessonPlayer />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/speaking" element={<SpeakingPage />} />
        <Route path="/speaking/:id" element={<RolePlayPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/grammar/:gid" element={<GrammarBooster />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/review/:reviewId" element={<LessonPlayer review />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/exams/:examId" element={<ExamRunner />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/certificate/:kind/:id" element={<CertificatePage />} />
        <Route path="/teacher" element={<TeacherOnly><Teacher /></TeacherOnly>} />
        <Route path="/teacher/student/:id" element={<TeacherOnly><StudentReport /></TeacherOnly>} />
        <Route path="/classroom" element={<TeacherOnly><Classroom /></TeacherOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
      <ConfirmHost />
    </AppProvider>
  );
}
