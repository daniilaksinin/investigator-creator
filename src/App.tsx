import InvestigatorCreator from "./investigatorCreator/InvestigatorCreator";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Створення дослідника</h1>
        <p className="app__subtitle">
          Поклик Ктулху — заповніть кроки нижче і завантажте готовий лист персонажа.
        </p>
      </header>
      <main className="app__main">
        <InvestigatorCreator />
      </main>
      <footer className="app__footer">
        Зроблено для{" "}
        <a href="https://github.com/daniilaksinin/keereps-codex" target="_blank" rel="noreferrer">
          Keeper's Codex
        </a>
      </footer>
    </div>
  );
}

export default App;
