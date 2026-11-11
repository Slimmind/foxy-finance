import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fox } from './components/Fox';
import type { Fund } from './data/catalog';
import type { Market } from './data/etfs';
import type { ProfileId } from './data/profiles';
import type { Plan } from './lib/allocate';
import { createOperation } from './lib/operations';
import { CUSTOM_COLOR, CUSTOM_LABEL, addFund, removeFund, type CustomItem, type PortfolioSource } from './lib/portfolio';
import { assessRisk, isComplete } from './lib/scoring';
import { defaultState, MAX_HISTORY, type AppState, type Operation } from './lib/storage';
import { useVault, vault } from './secure';
import { Amount } from './screens/Amount';
import { Builder } from './screens/Builder';
import { Catalog } from './screens/Catalog';
import { Home } from './screens/Home';
import { OperationEdit } from './screens/OperationEdit';
import { OperationView } from './screens/OperationView';
import { Operations } from './screens/Operations';
import { PlanView, type PlanInput } from './screens/plan/PlanView';
import { Quiz } from './screens/Quiz';
import { Result } from './screens/Result';
import { Settings } from './screens/settings/Settings';

type Screen =
  | 'home'
  | 'quiz'
  | 'result'
  | 'amount'
  | 'plan'
  | 'history'
  | 'operation'
  | 'operation-edit'
  | 'settings'
  | 'catalog'
  | 'builder';

interface Props {
  initialState: AppState;
  onOpenInstall: () => void;
}

export default function App({ initialState, onOpenInstall }: Props) {
  const [app, setApp] = useState<AppState>(initialState);
  const [screen, setScreen] = useState<Screen>('home');
  const [planInput, setPlanInput] = useState<PlanInput | null>(null);
  /** Whether the amount screen is spreading money over the quiz profile or over the hand-built portfolio. */
  const [amountTarget, setAmountTarget] = useState<'profile' | 'custom'>('profile');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const main = useRef<HTMLElement>(null);
  const { status } = useVault();
  const protectedData = status === 'unlocked';

  useEffect(() => {
    void vault.save(app);
  }, [app]);

  useEffect(() => {
    history.replaceState({ screen: 'home' }, '');
    const onPop = (e: PopStateEvent) => setScreen((e.state?.screen as Screen | undefined) ?? 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [screen]);

  const go = useCallback((next: Screen) => {
    history.pushState({ screen: next }, '');
    setScreen(next);
  }, []);

  const patch = (p: Partial<AppState>) => setApp((s) => ({ ...s, ...p }));
  const risk = useMemo(() => (isComplete(app.answers) ? assessRisk(app.answers) : null), [app.answers]);

  const customMarket = app.custom.market;
  const customItems = app.custom.items[customMarket];
  const setCustomItems = (market: Market, items: CustomItem[]) =>
    setApp((s) => ({ ...s, custom: { ...s.custom, items: { ...s.custom.items, [market]: items } } }));
  const setCustomMarket = (market: Market) => setApp((s) => ({ ...s, custom: { ...s.custom, market } }));

  const toggleFund = (fund: Fund) => {
    const items = app.custom.items[fund.market];
    const has = items.some((i) => i.fundId === fund.id);
    setCustomItems(fund.market, has ? removeFund(items, fund.id) : addFund(items, fund.id));
  };

  /** Records a calculation as a completed operation; returns the new operation's id. */
  const recordOperation = (plan: Plan, source: PortfolioSource, meta: { date: string; note: string }): string => {
    const op = createOperation(plan, source, meta);
    setApp((s) => ({ ...s, history: [op, ...s.history].slice(0, MAX_HISTORY) }));
    return op.id;
  };
  const updateOperation = (op: Operation) =>
    setApp((s) => ({ ...s, history: s.history.map((h) => (h.id === op.id ? op : h)) }));
  const deleteOperation = (id: string) => setApp((s) => ({ ...s, history: s.history.filter((h) => h.id !== id) }));
  const openOperation = (id: string) => {
    setSelectedId(id);
    go('operation');
  };
  const editOperationScreen = (id: string) => {
    setSelectedId(id);
    go('operation-edit');
  };
  const selected = app.history.find((h) => h.id === selectedId);

  const goAmount = (target: 'profile' | 'custom') => {
    setAmountTarget(target);
    go('amount');
  };

  // Screens that need data fall back to home when it is missing (e.g. after a reload on a deep screen).
  const missingData =
    screen === 'result' ||
    (screen === 'amount' && amountTarget === 'profile')
      ? !risk
      : screen === 'amount'
        ? customItems.length === 0
        : screen === 'plan'
          ? !planInput
          : false;
  // A deleted or unknown operation sends the user back to the list instead of a blank screen.
  const noOperation = (screen === 'operation' || screen === 'operation-edit') && !selected;
  const view: Screen = missingData ? 'home' : noOperation ? 'history' : screen;

  const amountTargetInfo =
    amountTarget === 'custom'
      ? { kind: 'custom' as const, label: CUSTOM_LABEL, color: CUSTOM_COLOR }
      : risk
        ? { kind: 'profile' as const, label: risk.profile.name, color: risk.profile.color }
        : null;

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => go('home')} aria-label="На главную">
          <Fox scale={3} />
          <span>FOXY</span>
        </button>
        <div className="topbar__actions">
          <button className="btn btn--small" onClick={() => go('history')}>
            Операции
          </button>
          <button className="btn btn--small" onClick={() => go('settings')}>
            <span className={`dot ${protectedData ? 'is-on' : ''}`} aria-hidden="true" />
            Защита
            <span className="sr-only">{protectedData ? ': включена' : ': выключена'}</span>
          </button>
        </div>
      </header>

      <main ref={main} tabIndex={-1} className="main">
        {view === 'home' && (
          <Home
            hasProfile={!!risk}
            profileName={risk?.profile.name}
            onStart={() => {
              patch({ answers: {} });
              go('quiz');
            }}
            onContinue={() => goAmount('profile')}
            onInstall={onOpenInstall}
            onCatalog={() => go('catalog')}
            onBuilder={() => go('builder')}
          />
        )}

        {view === 'quiz' && (
          <Quiz
            answers={app.answers}
            onAnswer={(id, idx) => patch({ answers: { ...app.answers, [id]: idx } })}
            onFinish={() => go('result')}
            onExit={() => go('home')}
          />
        )}

        {view === 'result' && risk && (
          <Result
            risk={risk}
            showSecurityNudge={status === 'plain'}
            onSecure={() => go('settings')}
            onNext={() => goAmount('profile')}
            onBuilder={() => go('builder')}
            onRetake={() => {
              patch({ answers: {} });
              go('quiz');
            }}
          />
        )}

        {view === 'catalog' && (
          <Catalog
            market={customMarket}
            selected={new Set(customItems.map((i) => i.fundId))}
            onMarket={setCustomMarket}
            onToggle={toggleFund}
            onOpenBuilder={() => go('builder')}
          />
        )}

        {view === 'builder' && (
          <Builder
            market={customMarket}
            items={customItems}
            risk={risk}
            onMarket={setCustomMarket}
            onItems={(items) => setCustomItems(customMarket, items)}
            onOpenCatalog={() => go('catalog')}
            onCalculate={() => goAmount('custom')}
          />
        )}

        {view === 'amount' && amountTargetInfo && (
          <Amount
            target={amountTargetInfo}
            showMarket={amountTarget === 'profile'}
            amount={app.amount}
            currency={app.currency}
            market={amountTarget === 'custom' ? customMarket : app.market}
            onChange={patch}
            onBack={() => go(amountTarget === 'custom' ? 'builder' : 'result')}
            onSubmit={(total) => {
              if (amountTarget === 'custom') {
                const items = customItems.filter((i) => i.weight > 0);
                setPlanInput({ source: { kind: 'custom', items }, total, currency: app.currency, market: customMarket });
              } else if (risk) {
                setPlanInput({
                  source: { kind: 'profile', profileId: risk.profile.id },
                  total,
                  currency: app.currency,
                  market: app.market,
                });
              }
              go('plan');
            }}
          />
        )}

        {view === 'plan' && planInput && (
          <PlanView
            input={planInput}
            quizProfileId={risk?.profile.id}
            operations={app.history}
            onRecord={recordOperation}
            onOpenOperation={openOperation}
            onProfileChange={(profileId: ProfileId) => setPlanInput({ ...planInput, source: { kind: 'profile', profileId } })}
            onEdit={() => {
              if (planInput.source.kind === 'custom') {
                // Make sure the amount screen works on this very portfolio.
                setCustomItems(planInput.market, planInput.source.items);
                setCustomMarket(planInput.market);
              }
              goAmount(planInput.source.kind);
            }}
            onEditPortfolio={() => {
              if (planInput.source.kind === 'custom') {
                setCustomItems(planInput.market, planInput.source.items);
                setCustomMarket(planInput.market);
              }
              go('builder');
            }}
          />
        )}

        {view === 'history' && (
          <Operations
            items={app.history}
            onHome={() => go('home')}
            onOpen={openOperation}
            onEdit={editOperationScreen}
            onDelete={deleteOperation}
            onClear={() => patch({ history: [] })}
          />
        )}

        {view === 'operation' && selected && (
          <OperationView
            op={selected}
            onBack={() => go('history')}
            onEdit={() => go('operation-edit')}
            onDelete={() => {
              deleteOperation(selected.id);
              go('history');
            }}
            onReopen={() => {
              setPlanInput({ source: selected.source, total: selected.total, currency: selected.currency, market: selected.market });
              go('plan');
            }}
          />
        )}

        {view === 'operation-edit' && selected && (
          <OperationEdit
            key={selected.id + (selected.updatedAt ?? '')}
            op={selected}
            onCancel={() => go('operation')}
            onSave={(updated) => {
              updateOperation(updated);
              go('operation');
            }}
          />
        )}

        {view === 'settings' && (
          <Settings
            app={app}
            onReplaceState={(next) => {
              setApp(next);
              setPlanInput(null);
            }}
            onWiped={() => {
              setApp(defaultState);
              setPlanInput(null);
            }}
            onOpenInstall={onOpenInstall}
          />
        )}
      </main>
    </div>
  );
}
