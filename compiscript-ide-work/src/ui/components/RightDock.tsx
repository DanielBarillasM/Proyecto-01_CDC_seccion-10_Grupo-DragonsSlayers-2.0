import { Braces, Database, Download, FlaskConical, FolderTree, ListChecks, Network } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyzeResult } from "../../lib/types";
import type { ScopeInfo } from "../../semantic/scopes";
import { DocumentationPanel } from "./DocumentationPanel";
import { EmptyPanel } from "./EmptyPanel";
import { ExportsPanel } from "./ExportsPanel";
import { ParseTreePanel } from "./ParseTreePanel";
import { ResultOverviewPanel } from "./ResultOverviewPanel";
import { ScopeTreePanel } from "./ScopeTreePanel";
import { SemanticTreePanel } from "./SemanticTreePanel";
import { SymbolTablePanel } from "./SymbolTablePanel";
import { TestsPanel } from "./TestsPanel";

export type DockTabId = "resultado" | "simbolos" | "ambitos" | "arboles" | "documentacion" | "exportar" | "pruebas";

interface RightDockProps {
  result: AnalyzeResult | null;
  inputText: string;
  activeTab: DockTabId;
  onTabChange: (tab: DockTabId) => void;
  onSelectScope: (chain: ScopeInfo[]) => void;
  onLoadTestSource?: (source: string) => void;
}

export function RightDock({ result, inputText, activeTab, onTabChange, onSelectScope, onLoadTestSource }: RightDockProps) {
  return (
    <Tabs value={activeTab} onValueChange={(next) => onTabChange(next as DockTabId)} className="flex h-full flex-col gap-0">
      <TabsList variant="line" className="h-9 justify-start overflow-x-auto rounded-none border-b-2 bg-card px-1">
        <TabsTrigger value="resultado" className="px-2">
          <ListChecks size={14} />
        </TabsTrigger>
        <TabsTrigger value="simbolos" className="px-2">
          <Database size={14} />
        </TabsTrigger>
        <TabsTrigger value="ambitos" className="px-2">
          <FolderTree size={14} />
        </TabsTrigger>
        <TabsTrigger value="arboles" className="px-2">
          <Network size={14} />
        </TabsTrigger>
        <TabsTrigger value="documentacion" className="px-2">
          <Braces size={14} />
        </TabsTrigger>
        <TabsTrigger value="exportar" className="px-2">
          <Download size={14} />
        </TabsTrigger>
        <TabsTrigger value="pruebas" className="px-2">
          <FlaskConical size={14} />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resultado" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <ResultOverviewPanel result={result} />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="simbolos" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {result ? <SymbolTablePanel result={result} /> : <EmptyPanel icon={<Database size={22} />} text="Ejecuta el análisis para ver los símbolos." />}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="ambitos" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {result ? (
            <ScopeTreePanel result={result} onSelectScope={onSelectScope} />
          ) : (
            <EmptyPanel icon={<FolderTree size={22} />} text="Ejecuta el análisis para ver los ámbitos." />
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="arboles" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {result ? (
            <div className="flex flex-col gap-2">
              <p className="px-3 pt-3 text-xs font-head uppercase tracking-wide text-muted-foreground">Árbol semántico anotado</p>
              <SemanticTreePanel result={result} />
              <Separator />
              <p className="px-3 text-xs font-head uppercase tracking-wide text-muted-foreground">Árbol de parseo ANTLR</p>
              <ParseTreePanel result={result} />
            </div>
          ) : (
            <EmptyPanel icon={<Network size={22} />} text="Ejecuta el análisis para ver los árboles." />
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="documentacion" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <DocumentationPanel />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="exportar" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <ExportsPanel result={result} inputText={inputText} />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="pruebas" className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <TestsPanel onLoadSource={onLoadTestSource} />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
