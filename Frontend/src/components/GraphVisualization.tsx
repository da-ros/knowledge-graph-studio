import React, { useEffect, useRef, useState } from 'react';
import { GraphData } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface GraphVisualizationProps {
  data: GraphData;
  width?: number;
  height?: number;
  isLoading?: boolean;
}

declare global {
  interface Window {
    d3: any;
  }
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  data,
  width,
  height,
  isLoading = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [d3Loaded, setD3Loaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    // Load D3.js dynamically
    if (!window.d3) {
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v4.min.js';
      script.onload = () => setD3Loaded(true);
      document.head.appendChild(script);
    } else {
      setD3Loaded(true);
    }
  }, []);

  // Handle resize and calculate dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = width || Math.min(containerRect.width - 32, 1200); // 32px for padding
        const newHeight = height || Math.min(window.innerHeight * 0.6, 800); // 60% of viewport height, max 800px
        setDimensions({ width: newWidth, height: newHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);

  useEffect(() => {
    if (!d3Loaded || !data || !svgRef.current) return;

    const d3 = window.d3;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const nodes = data.nodes;
    const links = data.links;
    const { width: currentWidth, height: currentHeight } = dimensions;

    if (!nodes.length || !links.length) return;

    // Create node map for efficient lookup
    const nodeMap = {};
    nodes.forEach(node => {
      nodeMap[node.id] = node;
    });

    // Filter out links that reference non-existent nodes
    const validLinks = links.filter(link => 
      nodeMap[link.source] && nodeMap[link.target]
    );

    // Convert string references to object references
    validLinks.forEach(link => {
      link.source = nodeMap[link.source] as any;
      link.target = nodeMap[link.target] as any;
    });

    // Helper functions
    const getNeighbors = (node: any) => {
      return validLinks.reduce((neighbors, link: any) => {
        if (link.target.id === node.id) {
          neighbors.push(link.source.id);
        } else if (link.source.id === node.id) {
          neighbors.push(link.target.id);
        }
        return neighbors;
      }, [node.id]);
    };

    const isNeighborLink = (node: any, link: any) => {
      return link.target.id === node.id || link.source.id === node.id;
    };

    const getNodeColor = (node: any, neighbors: any) => {
      if (Array.isArray(neighbors) && neighbors.indexOf(node.id) > -1) {
        return node.level === 1 ? '#3b82f6' : '#10b981';
      }
      return node.level === 1 ? '#ef4444' : '#6b7280';
    };

    const getLinkColor = (node: any, link: any) => {
      return isNeighborLink(node, link) ? '#10b981' : '#e5e7eb';
    };

    const getTextColor = (node: any, neighbors: any) => {
      return Array.isArray(neighbors) && neighbors.indexOf(node.id) > -1 ? '#10b981' : '#374151';
    };

    // Set up the SVG
    svg.attr('width', currentWidth).attr('height', currentHeight);

    const container = svg.append('g');

    // Simulation setup
    const linkForce = d3.forceLink()
      .id(d => d.id)
      .distance(120)
      .strength(0.3);

    const simulation = d3.forceSimulation()
      .force('link', linkForce)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(currentWidth / 2, currentHeight / 2))
      .force('collision', d3.forceCollide().radius(40))
      .force('x', d3.forceX(currentWidth / 2).strength(0.05))
      .force('y', d3.forceY(currentHeight / 2).strength(0.05))
      .alpha(0.5)
      .alphaDecay(0.02);

    // Track if dragging occurred to prevent click events
    let isDragging = false;

    // Drag behavior (matching the working HTML version exactly)
    const dragDrop = d3.drag()
      .on('start', function(node) {
        isDragging = false;
        node.fx = node.x;
        node.fy = node.y;
        // Visual feedback
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function(node) {
        isDragging = true;
        simulation.alphaTarget(0.7).restart();
        node.fx = d3.event.x;
        node.fy = d3.event.y;
      })
      .on('end', function(node) {
        if (!isDragging) {
          node.fx = null;
          node.fy = null;
        }
        simulation.alphaTarget(0.1);
        d3.select(this).style('cursor', 'grab');
      });

    // Create links
    const linkElements = container.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(validLinks)
      .enter().append("line")
      .attr("stroke-width", 1)
      .attr("stroke", "rgba(50, 50, 50, 0.2)");

    // Create link labels
    const linkText = container.append("g")
      .attr("class", "texts")
      .selectAll("text")
      .data(validLinks)
      .enter().append("text")
      .attr("font-family", "Arial, Helvetica, sans-serif")
      .attr("fill", "Black")
      .style("font", "normal 10px Arial")
      .attr("text-anchor", "middle")
      .attr("dy", (d, i) => (i % 3 - 1) * 15)
      .text(d => d.linkName);

    // Create nodes with responsive sizing
    const isMobile = currentWidth < 768;
    const nodeRadius = isMobile ? 12 : 15;
    const secondaryRadius = isMobile ? 8 : 10;
    
    const nodeElements = container.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", d => d.level === 1 ? nodeRadius : secondaryRadius)
      .attr("fill", getNodeColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "grab")
      .call(dragDrop)
      .on('click', function(node) {
        if (!isDragging) {
          selectNode(node);
        }
      });

    // Create node labels with responsive sizing
    const textElements = container.append("g")
      .attr("class", "texts")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text(node => node.label)
      .attr("font-size", isMobile ? 10 : 12)
      .attr("dx", isMobile ? 15 : 20)
      .attr("dy", 4)
      .attr("font-family", "Arial, sans-serif")
      .attr("fill", "#333");

    // Initial positioning
    const radius = Math.min(currentWidth, currentHeight) / 3;
    const centerX = currentWidth / 2;
    const centerY = currentHeight / 2;
    const angleStep = (2 * Math.PI) / nodes.length;

    nodes.forEach((d: any, i) => {
      if (!d.x) d.x = centerX + radius * Math.cos(i * angleStep);
      if (!d.y) d.y = centerY + radius * Math.sin(i * angleStep);
      if (!d.vx) d.vx = 0;
      if (!d.vy) d.vy = 0;
    });

    // Simulation tick
    simulation.nodes(nodes).on('tick', () => {
      const padding = 60;
      nodes.forEach((node: any) => {
        node.x = Math.max(padding, Math.min(currentWidth - padding, node.x));
        node.y = Math.max(padding, Math.min(currentHeight - padding, node.y));
      });
      
      nodeElements
        .attr('cx', (node: any) => node.x)
        .attr('cy', (node: any) => node.y);
      
      textElements
        .attr('x', (node: any) => node.x)
        .attr('y', (node: any) => node.y);
      
      linkElements
        .attr('x1', (link: any) => link.source.x)
        .attr('y1', (link: any) => link.source.y)
        .attr('x2', (link: any) => link.target.x)
        .attr('y2', (link: any) => link.target.y);
      
      linkText
        .attr("x", (link: any) => (link.source.x + link.target.x) / 2)
        .attr("y", (link: any) => (link.source.y + link.target.y) / 2)
        .attr("dy", (d: any, i: number) => {
          const angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
          const offset = Math.sin(angle) * 20;
          return offset + (i % 2) * 10;
        });
    });

    simulation.force("link").links(validLinks);
    simulation.alpha(1).restart();

    // Slow down simulation after initial movement
    setTimeout(() => {
      simulation.alphaTarget(0.1);
    }, 3000);

    // Node selection and highlighting
    let selectedNode = null;

    function selectNode(node) {
      selectedNode = node;
      const neighbors = getNeighbors(node);
      
      // Update node colors
      nodeElements
        .attr('fill', (d: any) => getNodeColor(d, neighbors))
        .attr('stroke', (d: any) => 
          Array.isArray(neighbors) && neighbors.indexOf(d.id) > -1 ? '#10b981' : '#fff'
        )
        .attr('stroke-width', (d: any) => 
          Array.isArray(neighbors) && neighbors.indexOf(d.id) > -1 ? 3 : 2
        );

      // Update link colors
      linkElements
        .attr('stroke', (d: any) => getLinkColor(node, d))
        .attr('stroke-opacity', (d: any) => isNeighborLink(node, d) ? 0.8 : 0.2);

      // Update text colors
      textElements
        .attr('fill', (d: any) => getTextColor(d, neighbors))
        .style('font-weight', (d: any) => 
          Array.isArray(neighbors) && neighbors.indexOf(d.id) > -1 ? 'bold' : 'normal'
        );
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };

  }, [d3Loaded, data, dimensions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No graph data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Graph Visualization */}
      <svg
        ref={svgRef}
        className="w-full h-full border rounded-lg"
        style={{ 
          minHeight: dimensions.height,
          maxHeight: '80vh' // Prevent going off-screen on mobile
        }}
      />
    </div>
  );
};

export default GraphVisualization;