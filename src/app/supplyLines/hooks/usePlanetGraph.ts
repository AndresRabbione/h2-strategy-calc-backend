import {
  addEdge,
  Connection,
  Edge,
  MarkerType,
  Node,
  NodeMouseHandler,
  OnConnect,
  OnNodeDrag,
  OnSelectionChangeParams,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { GraphDBPlanet } from "../flow/page";
import { createClient } from "@/utils/supabase/client";
import { SupplyLineInsert } from "@/lib/typeDefinitions";
import {
  PostgrestError,
  PostgrestSingleResponse,
} from "@supabase/postgrest-js";
import { Database } from "../../../../database.types";

export type PlanetLink = {
  bidirectional: boolean | null;
  destination_disabled: boolean | null;
  destination_planet_name: string | null;
  linkedPlanetId: number | null;
  origin_disabled: boolean | null;
  origin_planet_name: string | null;
  planetId: number | null;
  supply_line_id?: number | null;
};

export type PlanetLinkInsert = {
  bidirectional: boolean;
  destination_disabled: boolean;
  destination_planet_name: string;
  linkedPlanetId: number;
  origin_disabled: boolean;
  origin_planet_name: string;
  planetId: number;
};

export type PlanetNodeData = {
  name: string;
  disabled: boolean;
  current_faction: number;
};

export type LinkEdgeData = Partial<PlanetLink>;

type LabeledOperation =
  | {
      name: "Updating Planet";
      nodeId: string;
      exec: () => Promise<PostgrestSingleResponse<PlanetRow>>;
    }
  | {
      name:
        | "Creating Supply Line"
        | "Updating Supply Line"
        | "Deleting Supply Line";
      edgeId: string;
      exec: () => Promise<PostgrestSingleResponse<SupplyLineRow>>;
    };

type OperationReportBase<T> = {
  name: LabeledOperation["name"];
  key: string;
  status: "fulfilled";
  value: PostgrestSingleResponse<T> | null;
  supabaseError?: PostgrestError;
};

type OperationReportFailure = {
  name: LabeledOperation["name"];
  key: string;
  status: "rejected";
  reason: PromiseRejectedResult["reason"];
};

export type OperationReport =
  | OperationReportBase<SupplyLineRow>
  | OperationReportBase<PlanetRow>
  | OperationReportFailure;

export type FinalReport =
  | {
      ok: true;
      summary: { inserted: number; updated: number; deleted: number };
    }
  | { ok: false; report: OperationReport[] };

type SupplyLineRow = Database["public"]["Tables"]["supplyLine"]["Row"];
type PlanetRow = Database["public"]["Tables"]["planet"]["Row"];

const totalScalar = 3200;
const NODE_W = 140;
const NODE_H = 64;

const makeNodes = (planets: GraphDBPlanet[]): Node<PlanetNodeData>[] =>
  planets.map((planet) => {
    const widthScalar = planet.map_x === 0 ? 0 : NODE_W;
    const heightScalar = planet.map_y === 0 ? 0 : NODE_H;

    return {
      id: String(planet.id!),
      position: {
        x: planet.map_x * (totalScalar + widthScalar),
        y: -1 * planet.map_y * (totalScalar + heightScalar),
      },
      data: {
        name: planet.name,
        disabled: planet.disabled,
        current_faction: planet.current_faction,
      },
      selectable: true,
      type: "planet",
    };
  });

const makeEdges = (supplyLines: PlanetLink[]) =>
  supplyLines.map((link) => {
    const id = `edge*${link.planetId}*${link.linkedPlanetId}*${link.supply_line_id}`;

    const edge: Edge<LinkEdgeData> = {
      id,
      source: `${link.planetId}`,
      target: `${link.linkedPlanetId}`,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 10,
      },
      data: {
        supply_line_id: link.supply_line_id,
        destination_disabled: link.destination_disabled,
        origin_disabled: link.origin_disabled,
      },
      style: { strokeWidth: 2 },
      animated: false,
      type: "link",
      sourceHandle: undefined,
      targetHandle: undefined,
    };

    if (link.bidirectional) {
      edge.markerStart = { type: MarkerType.ArrowClosed, width: 10, height: 7 };
    }

    return edge;
  });

type PlanetNode = Node<PlanetNodeData>;

type LinkEdge = Edge<LinkEdgeData>;

export type GraphInstance = ReactFlowInstance<PlanetNode, LinkEdge>;

export function usePlanetGraph(planets: GraphDBPlanet[], links: PlanetLink[]) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PlanetNode>(
    makeNodes(planets)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<LinkEdge>(
    makeEdges(links)
  );
  const [linkIdsToInsert, setInsertLinkIds] = useState<string[]>([]);
  const [linksToUpdate, setUpdatedLinks] = useState<
    { edgeId: string; originalState: Partial<PlanetLink> }[]
  >([]);
  const [planetsToUpdate, setUpdatedPlanets] = useState<
    { nodeId: string; originalState: boolean }[]
  >([]);
  const [linksToDelete, setDeletedLinks] = useState<PlanetLink[]>([]);

  const rfInstance = useRef<GraphInstance | null>(null);

  const [selectedElement, setSelectedElement] = useState<{
    type: "node" | "edge";
    id: string;
  } | null>(null);
  const selectedRef = useRef<string | null>(null);

  const [addMode, setAddMode] = useState(false);

  const [pendingSource, setPendingSource] = useState<string | null>(null);
  const [saveReport, setReport] = useState<FinalReport | null>(null);
  const [isSaving, setSaving] = useState(false);

  const planetsByID = useMemo(() => {
    const map = new Map<string, GraphDBPlanet>();

    for (const p of planets) map.set(String(p.id), p);
    return map;
  }, [planets]);

  const onInit = useCallback(
    (instance: GraphInstance) => (rfInstance.current = instance),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const source = planetsByID.get(connection.source);
      const target = planetsByID.get(connection.target);

      const dbPayload: PlanetLink = {
        bidirectional: true,
        destination_disabled: target!.disabled,
        destination_planet_name: target!.name,
        linkedPlanetId: target!.id,
        origin_disabled: source!.disabled,
        origin_planet_name: source!.name,
        planetId: source!.id,
      };

      const newEdge: Edge<PlanetLink> = {
        id: `edge*${dbPayload.planetId}*${dbPayload.linkedPlanetId}`,
        source: `${dbPayload.planetId}`,
        target: `${dbPayload.linkedPlanetId}`,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 10 },
        data: dbPayload,
        style: { strokeWidth: 2 },
        type: "link",
      };

      setEdges((prevEdges) => addEdge(newEdge, prevEdges));
      setInsertLinkIds((prevIds) => [...prevIds, newEdge.id]);
    },
    [planetsByID, setEdges]
  );

  const onSelectionChange = useCallback(
    (selection: OnSelectionChangeParams) => {
      let newSelection: { type: "node" | "edge"; id: string } | null = null;

      if (selection.edges && selection.edges.length > 0) {
        newSelection = { type: "edge", id: selection.edges[0].id };
      } else if (selection.nodes && selection.nodes.length > 0) {
        newSelection = { type: "node", id: selection.nodes[0].id };
      }

      const newId = newSelection?.id ?? null;

      if (selectedRef.current !== newId) {
        selectedRef.current = newId;
        setSelectedElement(newSelection);
      }
    },
    []
  );

  const onNodeClick: NodeMouseHandler<PlanetNode> = useCallback(
    (edge, node) => {
      if (!addMode) return;

      if (!pendingSource) {
        setPendingSource(node.id);
      } else if (node.id === pendingSource) {
        setPendingSource(null);
      } else {
        const hasExistingConnections = edges.some((edge) => {
          const data = edge.data;
          if (!data) return false;

          const sourceId = Number(pendingSource);
          const targetId = Number(node.id);
          const forward =
            data.planetId === sourceId && data.linkedPlanetId === targetId;
          const reverse =
            data.planetId === targetId && data.linkedPlanetId === sourceId;
          return forward || reverse;
        });

        if (hasExistingConnections) {
          alert("Cannot create duplicate connections");
          setPendingSource(null);
          return;
        }

        const sourceNode = nodes.find(
          (currentNode) => currentNode.id === pendingSource
        );
        const dbPayload: PlanetLink = {
          bidirectional: true,
          destination_disabled: node.data.disabled,
          destination_planet_name: node.data.name,
          linkedPlanetId: Number(node.id),
          origin_disabled: sourceNode!.data.disabled,
          origin_planet_name: sourceNode!.data.name,
          planetId: Number(pendingSource),
        };

        const newEdge: Edge<PlanetLink> = {
          id: `edge*${dbPayload.planetId}*${dbPayload.linkedPlanetId}`,
          source: `${dbPayload.planetId}`,
          target: `${dbPayload.linkedPlanetId}`,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 10 },
          data: dbPayload,
          style: { strokeWidth: 2 },
          type: "link",
        };

        setEdges((prevEdges) => addEdge(newEdge, prevEdges));
        setInsertLinkIds((prevIds) => [...prevIds, newEdge.id]);
        setPendingSource(null);
      }
    },
    [nodes, pendingSource, setEdges, edges, addMode]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedElement) return;

    if (selectedElement.type === "edge") {
      const selectedEdge = edges.find((edge) => edge.id === selectedElement.id);
      if (selectedEdge?.data?.supply_line_id) {
        setDeletedLinks((prev) => [...prev, selectedEdge?.data as PlanetLink]);
      }
      setEdges((prevEdges) =>
        prevEdges.filter((edge) => edge.id !== selectedElement.id)
      );
    } else {
      //TODO: Temporary until better warning system
      alert("Planets cannot be deleted");
    }

    setSelectedElement(null);
  }, [selectedElement, setEdges, edges]);

  const updateLinkData = useCallback(
    (edgeId: string, patch: Partial<PlanetLink>) => {
      const updatedEdge = edges.find((edge) => edge.id === edgeId);
      setUpdatedLinks((prev) => {
        const edgeIds = prev.map((edge) => edge.edgeId);
        if (edgeIds.includes(edgeId) || !updatedEdge?.data?.supply_line_id) {
          return prev;
        }

        return [...prev, { edgeId, originalState: updatedEdge!.data! }];
      });
      setEdges((prevEdges) => {
        return prevEdges.map((edge) => {
          if (edge.id === edgeId) {
            return { ...edge, data: { ...edge.data, ...patch } };
          }

          return edge;
        });
      });
    },
    [setEdges, edges]
  );

  const updatePlanetData = useCallback(
    (nodeId: string, disabled: boolean) => {
      const updatedNode = nodes.find((node) => node.id === nodeId);

      setUpdatedPlanets((prev) => {
        const nodeIds = prev.map((node) => node.nodeId);
        if (nodeIds.includes(nodeId)) {
          return prev;
        }

        return [...prev, { nodeId, originalState: updatedNode!.data.disabled }];
      });
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, disabled } };
          }

          return node;
        })
      );
    },
    [setNodes, nodes]
  );

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedElement?.id),
    [edges, selectedElement]
  );
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedElement?.id),
    [nodes, selectedElement]
  );

  const dragTimeout = useRef<number | null>(null);
  const onNodeDragStop: OnNodeDrag<PlanetNode> = useCallback(
    (__event, draggedNode) => {
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === draggedNode.id
            ? { ...node, position: draggedNode.position }
            : node
        )
      );

      if (dragTimeout.current) window.clearTimeout(dragTimeout.current);
      dragTimeout.current = window.setTimeout(() => {}, 250);
    },
    [setNodes]
  );

  const restorePriorState = useCallback(() => {
    const restoredEdges: LinkEdge[] = [];
    const restoredNodes: PlanetNode[] = [];
    for (const deletedLink of linksToDelete) {
      const newEdge: LinkEdge = {
        id: `edge*${deletedLink.planetId}*${deletedLink.linkedPlanetId}`,
        source: `${deletedLink.planetId}`,
        target: `${deletedLink.linkedPlanetId}`,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 10 },
        data: deletedLink,
        style: { strokeWidth: 2 },
        type: "link",
      };
      restoredEdges.push(newEdge);
    }

    const restoredLinkIds: string[] = [];

    for (const updatedLink of linksToUpdate) {
      const currentEdge = edges.find((edge) => edge.id === updatedLink.edgeId);
      const restoredLink: LinkEdge = {
        ...currentEdge!,
        data: updatedLink.originalState,
      };
      restoredLinkIds.push(updatedLink.edgeId);
      restoredEdges.push(restoredLink);
    }

    restoredLinkIds.push(...linkIdsToInsert);

    const restoredNodeIds: string[] = [];

    for (const updatedPlanet of planetsToUpdate) {
      const currentNode = nodes.find(
        (node) => node.id === updatedPlanet.nodeId
      );
      const restoredPlanet: PlanetNode = {
        ...currentNode!,
        data: { ...currentNode!.data, disabled: updatedPlanet.originalState },
      };
      restoredNodeIds.push(updatedPlanet.nodeId);
      restoredNodes.push(restoredPlanet);
    }

    setEdges((prevEdges) => {
      const unchangedEdges = prevEdges.filter(
        (edge) => !restoredLinkIds.includes(edge.id)
      );

      return [...unchangedEdges, ...restoredEdges];
    });
    setNodes((prevNodes) => {
      const unchangedNodes = prevNodes.filter(
        (node) => !restoredNodeIds.includes(node.id)
      );

      return [...unchangedNodes, ...restoredNodes];
    });
    setInsertLinkIds([]);
    setDeletedLinks([]);
    setUpdatedLinks([]);
    setUpdatedPlanets([]);
  }, [
    linksToDelete,
    setEdges,
    linksToUpdate,
    nodes,
    planetsToUpdate,
    edges,
    setNodes,
    linkIdsToInsert,
  ]);

  const finalizeEdits = useCallback(async (): Promise<FinalReport> => {
    setAddMode(false);
    setSaving(true);
    const supabase = createClient();

    const insertedEdges = edges.filter((edge) =>
      linkIdsToInsert.includes(edge.id)
    );
    const updatedPlanetIds = planetsToUpdate.map((planet) => planet.nodeId);
    const updatedLinkIds = linksToUpdate.map((link) => link.edgeId);
    const deletedIds = linksToDelete.map((link) => link.supply_line_id!);

    const mappedInserts: { id: string; link: SupplyLineInsert }[] =
      insertedEdges.map((link) => {
        const linkData = link.data!;

        return {
          id: link.id,
          link: {
            planetId: linkData.planetId!,
            linkedPlanetId: linkData.linkedPlanetId!,
            bidirectional: linkData.bidirectional!,
          },
        };
      });

    const operations: LabeledOperation[] = [];
    for (const mapped of mappedInserts) {
      operations.push({
        name: "Creating Supply Line",
        edgeId: mapped.id,
        exec: async () =>
          supabase.from("supplyLine").insert(mapped.link).select().single(),
      });
    }

    const updatedNodes = nodes.filter((node) =>
      updatedPlanetIds.includes(node.id)
    );
    const updatedEdges = edges.filter((edge) =>
      updatedLinkIds.includes(edge.id)
    );

    for (const edge of updatedEdges) {
      const id = edge.data?.supply_line_id;
      if (!id) continue;

      operations.push({
        name: "Updating Supply Line",
        edgeId: edge.id,
        exec: async () =>
          supabase
            .from("supplyLine")
            .update({
              planetId: edge.data?.planetId ?? undefined,
              linkedPlanetId: edge.data?.linkedPlanetId ?? undefined,
              bidirectional: edge.data?.bidirectional ?? undefined,
            })
            .eq("id", id)
            .select()
            .single(),
      });
    }

    for (const node of updatedNodes) {
      operations.push({
        name: "Updating Planet",
        nodeId: node.id,
        exec: async () =>
          supabase
            .from("planet")
            .update({ disabled: node.data.disabled })
            .eq("id", Number(node.id))
            .select()
            .single(),
      });
    }

    for (const deletedId of deletedIds) {
      const fullLink = linksToDelete.find(
        (link) => link.supply_line_id === deletedId
      );
      operations.push({
        name: "Deleting Supply Line",
        edgeId: String(fullLink?.supply_line_id),
        exec: async () =>
          supabase
            .from("supplyLine")
            .delete()
            .eq("id", deletedId)
            .select()
            .single(),
      });
    }

    if (operations.length === 0) {
      setDeletedLinks([]);
      setInsertLinkIds([]);
      setUpdatedLinks([]);
      setUpdatedPlanets([]);
      setSaving(false);
      return { ok: true, summary: { inserted: 0, updated: 0, deleted: 0 } };
    }

    const settled = await Promise.allSettled(
      operations.map((operation) => operation.exec())
    );

    const report: OperationReport[] = [];

    for (let i = 0; i < settled.length; i++) {
      const operation = operations[i];
      const result = settled[i];

      if (result.status === "rejected") {
        report.push({
          name: operation.name,
          key:
            operation.name === "Updating Planet"
              ? operation.nodeId
              : operation.edgeId,
          status: "rejected",
          reason: result.reason,
        });
        continue;
      }

      const value = result.value;
      const supabaseError = value.error ?? undefined;

      report.push({
        name: operation.name,
        status: "fulfilled",
        supabaseError,
        value: value.data,
        key:
          operation.name === "Updating Planet"
            ? operation.nodeId
            : operation.edgeId,
      } as OperationReport);
    }

    if (!report.some((r) => r.status === "rejected" || r.supabaseError)) {
      setDeletedLinks([]);
      setInsertLinkIds([]);
      setUpdatedLinks([]);
      setUpdatedPlanets([]);
      setSaving(false);
      return {
        ok: true,
        summary: {
          updated: updatedNodes.length + updatedEdges.length,
          deleted: deletedIds.length,
          inserted: mappedInserts.length,
        },
      };
    }

    const failedInsertKeys = report
      .filter(
        (r) =>
          r.name === "Creating Supply Line" &&
          (r.status == "rejected" ||
            (r.status === "fulfilled" && r.supabaseError))
      )
      .map((insert) => insert.key);
    const failedLinkUpdateKeys = report
      .filter(
        (r) =>
          r.name === "Updating Supply Line" &&
          (r.status == "rejected" ||
            (r.status === "fulfilled" && r.supabaseError))
      )
      .map((update) => update.key);
    const failedDeleteKeys = report
      .filter(
        (r) =>
          r.name === "Deleting Supply Line" &&
          (r.status == "rejected" ||
            (r.status === "fulfilled" && r.supabaseError))
      )
      .map((deletion) => deletion.key);
    const failedPlanetUpdateKeys = report
      .filter(
        (r) =>
          r.name === "Updating Planet" &&
          (r.status == "rejected" ||
            (r.status === "fulfilled" && r.supabaseError))
      )
      .map((planet) => planet.key);

    setUpdatedPlanets((prev) =>
      prev.filter((planet) => failedPlanetUpdateKeys.includes(planet.nodeId))
    );
    setInsertLinkIds((prev) =>
      prev.filter((id) => failedInsertKeys.includes(id))
    );
    setUpdatedLinks((prev) =>
      prev.filter((link) => failedLinkUpdateKeys.includes(link.edgeId))
    );
    setDeletedLinks((prev) =>
      prev.filter((link) =>
        failedDeleteKeys.includes(String(link.supply_line_id))
      )
    );

    setSaving(false);

    return { ok: false, report };
  }, [
    edges,
    linkIdsToInsert,
    nodes,
    planetsToUpdate,
    linksToUpdate,
    linksToDelete,
  ]);

  return {
    // state
    nodes,
    edges,
    rfInstance,
    selectedElement,
    selectedEdge,
    selectedNode,
    addMode,
    // setters + handlers
    setRfInstance: onInit,
    setAddMode,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectionChange,
    onNodeClick,
    handleDeleteSelected,
    updateLinkData,
    onNodeDragStop,
    updatePlanetData,
    linkIdsToInsert,
    linksToUpdate,
    planetsToUpdate,
    linksToDelete,
    restorePriorState,
    finalizeEdits,
    saveReport,
    setReport,
    isSaving,
  } as const;
}
