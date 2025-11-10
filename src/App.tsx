import { BrowserRouter, Routes, Route } from "react-router";
import Home from "./pages/Home";
import CreateBoard from "./pages/CreateBoard";
import Dashboard from "./pages/Dashboard";
import BoardDisplay from "./pages/BoardDisplay";
import PaymentPage from "./pages/PaymentPage";
import Footer from "./components/Footer";

function App() {
  return (
    <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <div className="grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateBoard />} />
              <Route path="/dashboard/:boardId" element={<Dashboard />} />
              <Route path="/board/:boardId" element={<BoardDisplay />} />
              <Route path="/pay/:boardId" element={<PaymentPage />} />
            </Routes>
          </div>
        </div>
        <div>
          <Footer />
        </div>
    </BrowserRouter>
  );
}

export default App;
