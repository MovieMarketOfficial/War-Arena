import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { Shell } from '@/components/layout/Shell';
import Landing from '@/pages/Landing';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Nations from '@/pages/Nations';
import NationProfile from '@/pages/NationProfile';
import Cities from '@/pages/Cities';
import Military from '@/pages/Military';
import Wars from '@/pages/Wars';
import WarDetail from '@/pages/WarDetail';
import Alliances from '@/pages/Alliances';
import AllianceDetail from '@/pages/AllianceDetail';
import Market from '@/pages/Market';
import Diplomacy from '@/pages/Diplomacy';
import WorldMap from '@/pages/WorldMap';
import Leaderboard from '@/pages/Leaderboard';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/register" component={Register} />
      <Route path="/(.*)">
        <Shell>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/nations" component={Nations} />
            <Route path="/nations/:id" component={NationProfile} />
            <Route path="/cities" component={Cities} />
            <Route path="/military" component={Military} />
            <Route path="/wars" component={Wars} />
            <Route path="/wars/:id" component={WarDetail} />
            <Route path="/alliances" component={Alliances} />
            <Route path="/alliances/:id" component={AllianceDetail} />
            <Route path="/market" component={Market} />
            <Route path="/diplomacy" component={Diplomacy} />
            <Route path="/map" component={WorldMap} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route component={NotFound} />
          </Switch>
        </Shell>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;