const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface TextInput {
  text: string;
  enhance?: boolean;
}

export interface GraphMetadata {
  id: string;
  name: string;
  version: string;
  tags: string[];
  nodes: number;
  edges: number;
  created_at: string;
  updated_at: string;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    group: number;
    level: number;
    label: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    strength: number;
    linkName: string;
  }>;
}

export interface ProcessedGraph {
  metadata: GraphMetadata;
  data: GraphData;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (e) {
          // If we can't read the error text, use the status
        }
        throw new Error(`API Error: ${errorMessage}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request was aborted due to timeout');
        }
        throw error;
      }
      throw new Error(`Network error: ${error}`);
    }
  }

  async processText(input: TextInput): Promise<ProcessedGraph> {
    console.log('Starting process text request...');
    
    try {
      // First, start the processing (this might timeout, but that's OK)
      const result = await this.request<ProcessedGraph>('/api/process-text', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      console.log('Process text request completed successfully');
      return result;
    } catch (error) {
      console.error('Process text request failed:', error);
      
      // If we get a network error, it might be a timeout but the processing could still be happening
      // Let's check if any new graphs were created recently
      if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        console.log('Network error detected, checking for newly created graphs...');
        
        // Wait a bit and then check for new graphs
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        try {
          const graphs = await this.getGraphs();
          if (graphs.length > 0) {
            // Get the most recent graph
            const latestGraph = graphs.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            
            // Check if it was created in the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const graphCreatedAt = new Date(latestGraph.created_at);
            
            if (graphCreatedAt > fiveMinutesAgo) {
              console.log('Found recently created graph, fetching details...');
              const graphData = await this.getGraph(latestGraph.id);
              return graphData;
            }
          }
        } catch (pollError) {
          console.error('Error polling for new graphs:', pollError);
        }
      }
      
      throw error;
    }
  }

  async getGraphs(): Promise<GraphMetadata[]> {
    return this.request<GraphMetadata[]>('/api/graphs');
  }

  async getGraph(graphId: string): Promise<ProcessedGraph> {
    return this.request<ProcessedGraph>(`/api/graphs/${graphId}`);
  }

  async deleteGraph(graphId: string): Promise<{ message: string; deleted_documents: number }> {
    return this.request<{ message: string; deleted_documents: number }>(`/api/graphs/${graphId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
