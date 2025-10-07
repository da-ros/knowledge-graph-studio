import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, RefreshCw, ChevronRight, MoreVertical, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, GraphMetadata, ProcessedGraph } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import GraphVisualization from "@/components/GraphVisualization";

const Graphs = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingGraphId, setDeletingGraphId] = useState<string | null>(null);

  // Fetch graphs list
  const { data: graphs = [], isLoading: graphsLoading, error: graphsError } = useQuery({
    queryKey: ['graphs'],
    queryFn: () => apiClient.getGraphs(),
  });

  // Fetch specific graph if ID is provided
  const { data: currentGraph, isLoading: graphLoading } = useQuery({
    queryKey: ['graph', id],
    queryFn: () => apiClient.getGraph(id!),
    enabled: !!id,
  });

  // Delete graph mutation
  const deleteMutation = useMutation({
    mutationFn: (graphId: string) => {
      setDeletingGraphId(graphId);
      return apiClient.deleteGraph(graphId);
    },
    onSuccess: () => {
      setDeletingGraphId(null);
      queryClient.invalidateQueries({ queryKey: ['graphs'] });
      toast({
        title: "Graph deleted",
        description: "Graph has been successfully deleted.",
      });
    },
    onError: (error) => {
      setDeletingGraphId(null);
      toast({
        title: "Delete failed",
        description: "Failed to delete graph. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredGraphs = graphs.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteGraph = (graphId: string) => {
    if (window.confirm("Are you sure you want to delete this graph?")) {
      deleteMutation.mutate(graphId);
    }
  };

  // If viewing a specific graph, show the visualization
  if (id && currentGraph) {
    return (
      <div className="min-h-screen p-4">
        {/* App Bar */}
        <header className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/graphs")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{currentGraph.metadata.name}</h1>
              <p className="text-sm text-muted-foreground">
                {currentGraph.metadata.nodes} nodes • {currentGraph.metadata.edges} edges
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full glass-card-subtle"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['graph', id] })}
              disabled={graphLoading}
            >
              <RefreshCw className={`h-5 w-5 ${graphLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full glass-card-subtle"
              onClick={() => handleDeleteGraph(id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MoreVertical className="h-5 w-5" />
              )}
            </Button>
          </div>
        </header>

        {/* Graph Visualization */}
        <Card className="glass-card p-4 animate-scale-in">
          <div className="w-full h-full min-h-[400px]">
            <GraphVisualization
              data={currentGraph.data}
              isLoading={graphLoading}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      {/* App Bar */}
      <header className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Graphs</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full glass-card-subtle"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['graphs'] })}
          disabled={graphsLoading}
        >
          <RefreshCw className={`h-5 w-5 ${graphsLoading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {/* Search Bar */}
      <Card className="glass-card p-3 mb-4 animate-scale-in">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, tag, node..."
            className="pl-10 border-none bg-transparent focus-visible:ring-0"
          />
        </div>
      </Card>

      {/* Filter/Sort Bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 animate-fade-in">
        <Button variant="outline" size="sm" className="glass-card-subtle flex-shrink-0">
          Tags
        </Button>
        <Button variant="outline" size="sm" className="glass-card-subtle flex-shrink-0">
          Date
        </Button>
        <Button variant="outline" size="sm" className="glass-card-subtle flex-shrink-0">
          Size
        </Button>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <Button variant="outline" size="sm" className="glass-card-subtle">
            Recent
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {graphsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {graphsError && (
        <Card className="glass-card p-8 text-center mt-12 animate-fade-in">
          <p className="text-muted-foreground mb-4">Failed to load graphs</p>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['graphs'] })}
            className="bg-gradient-to-r from-accent to-primary text-white"
          >
            Try Again
          </Button>
        </Card>
      )}

      {/* Graph Cards */}
      {!graphsLoading && !graphsError && (
        <div className="space-y-3">
          {filteredGraphs.map((graph, index) => (
          <Card
            key={graph.id}
            className="glass-card p-4 hover:shadow-lg transition-all cursor-pointer animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">
                  {graph.name}{" "}
                  <span className="text-sm text-muted-foreground font-normal">
                    {graph.version}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {graph.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs bg-accent/10 text-accent hover:bg-accent/20 border-none"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>Nodes: {graph.nodes}</span>
              <span>Edges: {graph.edges}</span>
              <span>Updated: {new Date(graph.updated_at).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-accent to-primary text-white"
                onClick={() => navigate(`/graphs/${graph.id}`)}
              >
                Open
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="glass-card-subtle"
                onClick={() => handleDeleteGraph(graph.id)}
                disabled={deletingGraphId === graph.id}
              >
                {deletingGraphId === graph.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      )}
      {/* Empty State */}
      {!graphsLoading && !graphsError && filteredGraphs.length === 0 && (
        <div className="glass-card p-8 text-center mt-12 animate-fade-in">
          <p className="text-muted-foreground mb-4">No graphs found</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-accent to-primary text-white"
          >
            Create Your First Graph
          </Button>
        </div>
      )}
    </div>
  );
};

export default Graphs;
