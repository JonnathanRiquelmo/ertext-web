import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent
} from 'react';

import type { DiagramProjection } from '../modules/sync';

interface NodePosition {
  readonly x: number;
  readonly y: number;
}

interface CanvasMetrics {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly nodeGapX: number;
  readonly nodeGapY: number;
  readonly canvasPadding: number;
  readonly minCanvasWidth: number;
  readonly minCanvasHeight: number;
  readonly relationshipLabelOffset: number;
  readonly relationshipEndpointOffset: number;
}

type LayoutMap = Record<string, NodePosition>;

interface DiagramCanvasProps {
  readonly diagram: DiagramProjection;
  readonly onCreateEntity: (entityName: string) => void;
  readonly onRenameEntity: (entityId: string, nextName: string) => void;
  readonly onRemoveEntity: (entityId: string) => void;
  readonly onCreateRelationship: (sourceEntityId: string, targetEntityId: string) => void;
  readonly onRenameRelationship: (relationshipId: string, nextName: string) => void;
  readonly onRemoveRelationship: (relationshipId: string) => void;
  readonly onUpdateRelationshipCardinality: (
    relationshipId: string,
    participantEntityId: string,
    cardinality: { min: number; max: number | '*' }
  ) => void;
  readonly onUpsertRelationshipAttribute: (
    relationshipId: string,
    attributeName: string,
    dataType: string
  ) => void;
  readonly onRemoveRelationshipAttribute: (relationshipId: string, attributeName: string) => void;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 132;
const NODE_GAP_X = 260;
const NODE_GAP_Y = 180;
const CANVAS_PADDING = 80;
const MIN_CANVAS_WIDTH = 900;
const MIN_CANVAS_HEIGHT = 580;
const TABLET_BREAKPOINT = 1024;
const MOBILE_BREAKPOINT = 768;
const TABLET_NODE_WIDTH = 208;
const TABLET_NODE_HEIGHT = 126;
const TABLET_NODE_GAP_X = 236;
const TABLET_NODE_GAP_Y = 170;
const TABLET_CANVAS_PADDING = 68;
const TABLET_MIN_CANVAS_WIDTH = 760;
const TABLET_MIN_CANVAS_HEIGHT = 520;
const MOBILE_NODE_WIDTH = 176;
const MOBILE_NODE_HEIGHT = 116;
const MOBILE_NODE_GAP_X = 196;
const MOBILE_NODE_GAP_Y = 154;
const MOBILE_CANVAS_PADDING = 48;
const MOBILE_MIN_CANVAS_WIDTH = 360;
const MOBILE_MIN_CANVAS_HEIGHT = 440;
const LAYOUT_STORAGE_KEY = 'erdsl.diagram.layout.v1';
const ZOOM_STORAGE_KEY = 'erdsl.diagram.zoom.v1';
const RELATIONSHIP_COLOR = '#38bdf8';
const RELATIONSHIP_LABEL_OFFSET = 16;
const RELATIONSHIP_ENDPOINT_OFFSET = 28;
const GRID_COLUMNS = 3;
const DRAG_THRESHOLD = 4;
const DEFAULT_RELATIONSHIP_ATTRIBUTE_TYPE = 'TEXT';
const LAYOUT_PERSIST_DEBOUNCE_MS = 250;
const DEFAULT_ZOOM_LEVEL = 1;
const MIN_ZOOM_LEVEL = 0.5;
const MAX_ZOOM_LEVEL = 2;
const ZOOM_STEP = 0.1;
const ZOOM_TOLERANCE = 0.001;
const GENERALIZATION_COLOR = '#475569';
const EMPTY_ENTITY_NAME = '';
const INTERACTIVE_CANVAS_SELECTOR =
  '.entity-node, .diagram-connection, .diagram-specialization, .diagram-connection-label, .diagram-cardinality-label, .diagram-direction-label';

function isNodePosition(value: unknown): value is NodePosition {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.x === 'number' && typeof candidate.y === 'number';
}

function readPersistedLayout(): LayoutMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const serialized = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!serialized) {
      return {};
    }
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    return Object.entries(parsed).reduce<LayoutMap>((accumulator, [entityId, position]) => {
      if (isNodePosition(position)) {
        accumulator[entityId] = {
          x: position.x,
          y: position.y
        };
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function clampZoomLevel(value: number): number {
  return Math.min(Math.max(value, MIN_ZOOM_LEVEL), MAX_ZOOM_LEVEL);
}

function readPersistedZoomLevel(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_ZOOM_LEVEL;
  }
  try {
    const persistedZoomValue = window.localStorage.getItem(ZOOM_STORAGE_KEY);
    if (!persistedZoomValue) {
      return DEFAULT_ZOOM_LEVEL;
    }
    const parsedZoom = Number(persistedZoomValue);
    if (!Number.isFinite(parsedZoom)) {
      return DEFAULT_ZOOM_LEVEL;
    }
    return clampZoomLevel(parsedZoom);
  } catch {
    return DEFAULT_ZOOM_LEVEL;
  }
}

function resolveCanvasMetrics(viewportWidth: number): CanvasMetrics {
  if (viewportWidth <= MOBILE_BREAKPOINT) {
    return {
      nodeWidth: MOBILE_NODE_WIDTH,
      nodeHeight: MOBILE_NODE_HEIGHT,
      nodeGapX: MOBILE_NODE_GAP_X,
      nodeGapY: MOBILE_NODE_GAP_Y,
      canvasPadding: MOBILE_CANVAS_PADDING,
      minCanvasWidth: MOBILE_MIN_CANVAS_WIDTH,
      minCanvasHeight: MOBILE_MIN_CANVAS_HEIGHT,
      relationshipLabelOffset: 12,
      relationshipEndpointOffset: 18
    };
  }
  if (viewportWidth <= TABLET_BREAKPOINT) {
    return {
      nodeWidth: TABLET_NODE_WIDTH,
      nodeHeight: TABLET_NODE_HEIGHT,
      nodeGapX: TABLET_NODE_GAP_X,
      nodeGapY: TABLET_NODE_GAP_Y,
      canvasPadding: TABLET_CANVAS_PADDING,
      minCanvasWidth: TABLET_MIN_CANVAS_WIDTH,
      minCanvasHeight: TABLET_MIN_CANVAS_HEIGHT,
      relationshipLabelOffset: 14,
      relationshipEndpointOffset: 22
    };
  }
  return {
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    nodeGapX: NODE_GAP_X,
    nodeGapY: NODE_GAP_Y,
    canvasPadding: CANVAS_PADDING,
    minCanvasWidth: MIN_CANVAS_WIDTH,
    minCanvasHeight: MIN_CANVAS_HEIGHT,
    relationshipLabelOffset: RELATIONSHIP_LABEL_OFFSET,
    relationshipEndpointOffset: RELATIONSHIP_ENDPOINT_OFFSET
  };
}

function createDefaultPosition(index: number, metrics: CanvasMetrics): NodePosition {
  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  return {
    x: metrics.canvasPadding + column * metrics.nodeGapX,
    y: metrics.canvasPadding + row * metrics.nodeGapY
  };
}

function createAutoLayout(
  entities: readonly { id: string }[],
  metrics: CanvasMetrics
): LayoutMap {
  return entities.reduce<LayoutMap>((nextLayout, entity, index) => {
    nextLayout[entity.id] = createDefaultPosition(index, metrics);
    return nextLayout;
  }, {});
}

function syncLayoutWithEntities(
  entities: readonly { id: string }[],
  currentLayout: LayoutMap,
  metrics: CanvasMetrics
): LayoutMap {
  const nextLayout: LayoutMap = {};
  entities.forEach((entity, index) => {
    nextLayout[entity.id] = currentLayout[entity.id] ?? createDefaultPosition(index, metrics);
  });
  return nextLayout;
}

interface NodeCenter {
  readonly x: number;
  readonly y: number;
}

interface SelfLoopGeometry {
  readonly path: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly sourceCardinalityX: number;
  readonly sourceCardinalityY: number;
  readonly targetCardinalityX: number;
  readonly targetCardinalityY: number;
  readonly sourceDirectionX: number;
  readonly sourceDirectionY: number;
  readonly targetDirectionX: number;
  readonly targetDirectionY: number;
}

interface ConnectionParticipant {
  readonly min: number;
  readonly max: number | '*';
}

type CardinalityVisualVariant =
  | 'is-exactly-one'
  | 'is-optional'
  | 'is-one-many'
  | 'is-zero-many'
  | 'is-range';

function getCardinalityVisualVariant(participant: ConnectionParticipant): CardinalityVisualVariant {
  if (participant.min === 1 && participant.max === 1) {
    return 'is-exactly-one';
  }
  if (participant.min === 0 && participant.max === 1) {
    return 'is-optional';
  }
  if (participant.min === 1 && participant.max === '*') {
    return 'is-one-many';
  }
  if (participant.min === 0 && participant.max === '*') {
    return 'is-zero-many';
  }
  return 'is-range';
}

function isEditableActivationKey(event: ReactKeyboardEvent<SVGElement>): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

function findNodeCenter(entityId: string, layout: LayoutMap, metrics: CanvasMetrics): NodeCenter | null {
  const position = layout[entityId];
  if (!position) {
    return null;
  }
  return {
    x: position.x + metrics.nodeWidth / 2,
    y: position.y + metrics.nodeHeight / 2
  };
}

function createSelfLoopGeometry(center: NodeCenter, metrics: CanvasMetrics): SelfLoopGeometry {
  const halfNodeWidth = metrics.nodeWidth / 2;
  const halfNodeHeight = metrics.nodeHeight / 2;
  const endpointInset = Math.max(10, metrics.relationshipEndpointOffset / 2);
  const startX = center.x + halfNodeWidth - endpointInset;
  const endX = center.x - halfNodeWidth + endpointInset;
  const baselineY = center.y - halfNodeHeight + endpointInset;
  const controlOffsetX = Math.max(metrics.nodeWidth * 0.48, 52);
  const controlOffsetY = Math.max(metrics.nodeHeight * 1.1, 72);
  const controlY = baselineY - controlOffsetY;
  return {
    path: `M ${startX} ${baselineY} C ${startX + controlOffsetX} ${controlY}, ${endX - controlOffsetX} ${controlY}, ${endX} ${baselineY}`,
    labelX: center.x,
    labelY: controlY - 10,
    sourceCardinalityX: startX + 12,
    sourceCardinalityY: baselineY - 8,
    targetCardinalityX: endX - 12,
    targetCardinalityY: baselineY - 8,
    sourceDirectionX: startX + metrics.relationshipEndpointOffset / 2,
    sourceDirectionY: baselineY + 16,
    targetDirectionX: endX - metrics.relationshipEndpointOffset / 2,
    targetDirectionY: baselineY + 16
  };
}

interface DoubleClickRelationshipResult {
  readonly nextSourceEntityId: string | null;
  readonly shouldCreateRelationship: boolean;
  readonly relationshipSourceEntityId: string | null;
}

function resolveDoubleClickRelationshipAction(
  currentSourceEntityId: string | null,
  clickedEntityId: string
): DoubleClickRelationshipResult {
  if (!currentSourceEntityId) {
    return {
      nextSourceEntityId: clickedEntityId,
      shouldCreateRelationship: false,
      relationshipSourceEntityId: null
    };
  }
  return {
    nextSourceEntityId: null,
    shouldCreateRelationship: true,
    relationshipSourceEntityId: currentSourceEntityId
  };
}

function resolveEntityNameForCreation(preferredName: string): string {
  const normalizedName = preferredName.trim();
  return normalizedName.length > 0 ? normalizedName : EMPTY_ENTITY_NAME;
}

function isInteractiveCanvasElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest(INTERACTIVE_CANVAS_SELECTOR));
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
}

function resolveSpecializationSegments(
  specializations: DiagramProjection['specializations'],
  layout: LayoutMap,
  metrics: CanvasMetrics
): Array<{
  id: string;
  name: string;
  superCenter: NodeCenter;
  subCenter: NodeCenter;
}> {
  return specializations
    .map((specialization) => {
      const superCenter = findNodeCenter(specialization.superEntityId, layout, metrics);
      const subCenter = findNodeCenter(specialization.subEntityId, layout, metrics);
      if (!superCenter || !subCenter) {
        return null;
      }
      return {
        id: specialization.id,
        name: specialization.name,
        superCenter,
        subCenter
      };
    })
    .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment));
}

function clampPosition(
  value: NodePosition,
  canvasWidth: number,
  canvasHeight: number,
  metrics: CanvasMetrics
): NodePosition {
  const minX = metrics.canvasPadding / 2;
  const minY = metrics.canvasPadding / 2;
  const maxX = canvasWidth - metrics.nodeWidth - metrics.canvasPadding / 2;
  const maxY = canvasHeight - metrics.nodeHeight - metrics.canvasPadding / 2;
  return {
    x: Math.min(Math.max(value.x, minX), maxX),
    y: Math.min(Math.max(value.y, minY), maxY)
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export const diagramCanvasTestKit = {
  resolveCanvasMetrics,
  createDefaultPosition,
  createAutoLayout,
  syncLayoutWithEntities,
  clampPosition,
  createSelfLoopGeometry,
  resolveSpecializationSegments,
  resolveDoubleClickRelationshipAction,
  resolveEntityNameForCreation,
  isInteractiveCanvasElement,
  clampZoomLevel
} as const;

interface DragSession {
  readonly entityId: string;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly originX: number;
  readonly originY: number;
}

export function DiagramCanvas({
  diagram,
  onCreateEntity,
  onRenameEntity,
  onRemoveEntity,
  onCreateRelationship,
  onRenameRelationship,
  onRemoveRelationship,
  onUpdateRelationshipCardinality,
  onUpsertRelationshipAttribute,
  onRemoveRelationshipAttribute
}: DiagramCanvasProps) {
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const dragMovedRef = useRef(false);
  const persistTimeoutRef = useRef<number | null>(null);
  const pendingLayoutRef = useRef<string | null>(null);
  const persistedLayoutRef = useRef<string | null>(null);
  const [layout, setLayout] = useState<LayoutMap>(() => readPersistedLayout());
  const [zoomLevel, setZoomLevel] = useState<number>(() => readPersistedZoomLevel());
  const [viewportSize, setViewportSize] = useState({ width: MIN_CANVAS_WIDTH, height: MIN_CANVAS_HEIGHT });
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [sourceEntityId, setSourceEntityId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);
  const [focusedRelationshipId, setFocusedRelationshipId] = useState<string | null>(null);
  const [newEntityName, setNewEntityName] = useState('');
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingEntityName, setEditingEntityName] = useState('');
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [editingRelationshipName, setEditingRelationshipName] = useState('');
  const [newRelationshipAttributeName, setNewRelationshipAttributeName] = useState('');
  const [newRelationshipAttributeType, setNewRelationshipAttributeType] = useState(
    DEFAULT_RELATIONSHIP_ATTRIBUTE_TYPE
  );
  const [cardinalityDrafts, setCardinalityDrafts] = useState<Record<string, { min: string; max: string }>>({});
  const canvasMetrics = useMemo(() => resolveCanvasMetrics(viewportSize.width), [viewportSize.width]);

  useEffect(() => {
    setLayout((previousLayout) => syncLayoutWithEntities(diagram.entities, previousLayout, canvasMetrics));
  }, [canvasMetrics, diagram.entities]);

  useEffect(() => {
    if (
      selectedRelationshipId &&
      !diagram.relationships.some((relationship) => relationship.id === selectedRelationshipId)
    ) {
      setSelectedRelationshipId(null);
    }
  }, [diagram.relationships, selectedRelationshipId]);

  useEffect(() => {
    if (editingEntityId && !diagram.entities.some((entity) => entity.id === editingEntityId)) {
      setEditingEntityId(null);
      setEditingEntityName('');
    }
  }, [diagram.entities, editingEntityId]);

  useEffect(() => {
    if (editingRelationshipId && !diagram.relationships.some((item) => item.id === editingRelationshipId)) {
      setEditingRelationshipId(null);
      setEditingRelationshipName('');
    }
  }, [diagram.relationships, editingRelationshipId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' || isTextEntryTarget(event.target)) {
        return;
      }
      if (selectedRelationshipId) {
        event.preventDefault();
        onRemoveRelationship(selectedRelationshipId);
        setSelectedRelationshipId(null);
        setFocusedRelationshipId((currentId) => (currentId === selectedRelationshipId ? null : currentId));
        if (editingRelationshipId === selectedRelationshipId) {
          cancelRelationshipRename();
        }
        return;
      }
      if (!selectedEntityId) {
        return;
      }
      event.preventDefault();
      onRemoveEntity(selectedEntityId);
      setSelectedEntityId(null);
      setFocusedEntityId((currentId) => (currentId === selectedEntityId ? null : currentId));
      if (editingEntityId === selectedEntityId) {
        cancelEntityRename();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editingEntityId,
    editingRelationshipId,
    onRemoveEntity,
    onRemoveRelationship,
    selectedEntityId,
    selectedRelationshipId
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const serializedLayout = JSON.stringify(layout);
    pendingLayoutRef.current = serializedLayout;
    if (persistTimeoutRef.current !== null) {
      window.clearTimeout(persistTimeoutRef.current);
    }
    persistTimeoutRef.current = window.setTimeout(() => {
      if (typeof window === 'undefined') {
        return;
      }
      const pendingLayout = pendingLayoutRef.current;
      persistTimeoutRef.current = null;
      if (!pendingLayout || pendingLayout === persistedLayoutRef.current) {
        return;
      }
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, pendingLayout);
        persistedLayoutRef.current = pendingLayout;
      } catch {
        pendingLayoutRef.current = pendingLayout;
      }
    }, LAYOUT_PERSIST_DEBOUNCE_MS);
    return () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [layout]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoomLevel));
    } catch {
      // noop: storage may be unavailable
    }
  }, [zoomLevel]);

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') {
        return;
      }
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
      const pendingLayout = pendingLayoutRef.current;
      if (!pendingLayout || pendingLayout === persistedLayoutRef.current) {
        return;
      }
      try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, pendingLayout);
      } catch {
        pendingLayoutRef.current = pendingLayout;
      }
    };
  }, []);

  useEffect(() => {
    const viewportElement = canvasViewportRef.current;
    if (!viewportElement) {
      return;
    }
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setViewportSize({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(1, Math.floor(entry.contentRect.height))
      });
    });
    resizeObserver.observe(viewportElement);
    return () => resizeObserver.disconnect();
  }, []);

  const canvasSize = useMemo(() => {
    const positions = Object.values(layout);
    const maxX =
      positions.length > 0
        ? Math.max(...positions.map((position) => position.x + canvasMetrics.nodeWidth))
        : 0;
    const maxY =
      positions.length > 0
        ? Math.max(...positions.map((position) => position.y + canvasMetrics.nodeHeight))
        : 0;
    return {
      width: Math.max(
        viewportSize.width,
        canvasMetrics.minCanvasWidth,
        maxX + canvasMetrics.canvasPadding * 2
      ),
      height: Math.max(
        viewportSize.height,
        canvasMetrics.minCanvasHeight,
        maxY + canvasMetrics.canvasPadding * 2
      )
    };
  }, [canvasMetrics, layout, viewportSize.height, viewportSize.width]);

  const relationshipSegments = useMemo(() => {
    return diagram.relationships
      .map((relationship) => {
        if (relationship.isOccurrence) {
          const participantCenters = relationship.participants.map((p) => ({
            participant: p,
            center: findNodeCenter(p.entityId, layout, canvasMetrics)
          }));
          if (participantCenters.some((p) => !p.center)) {
            return null;
          }
          const validCenters = participantCenters as Array<{
            participant: typeof relationship.participants[number];
            center: NodeCenter;
          }>;
          const centerX = validCenters.reduce((sum, p) => sum + p.center.x, 0) / validCenters.length;
          const centerY = validCenters.reduce((sum, p) => sum + p.center.y, 0) / validCenters.length;
          return {
            type: 'occurrence' as const,
            id: relationship.id,
            name: relationship.name,
            participants: relationship.participants,
            participantCenters: validCenters,
            center: { x: centerX, y: centerY }
          };
        }

        const source = relationship.participants[0];
        const target = relationship.participants[1];
        if (!source || !target) {
          return null;
        }
        const sourceCenter = findNodeCenter(source.entityId, layout, canvasMetrics);
        const targetCenter = findNodeCenter(target.entityId, layout, canvasMetrics);
        if (!sourceCenter || !targetCenter) {
          return null;
        }
        return {
          type: 'normal' as const,
          id: relationship.id,
          name: relationship.name,
          participants: relationship.participants,
          sourceEntityId: source.entityId,
          targetEntityId: target.entityId,
          sourceCenter,
          targetCenter
        };
      })
      .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment));
  }, [canvasMetrics, diagram.relationships, layout]);

  const specializationSegments = useMemo(
    () => resolveSpecializationSegments(diagram.specializations, layout, canvasMetrics),
    [canvasMetrics, diagram.specializations, layout]
  );

  const selectedRelationship = useMemo(
    () => diagram.relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null,
    [diagram.relationships, selectedRelationshipId]
  );

  const stopConnecting = () => {
    setSourceEntityId(null);
    setIsConnectMode(false);
  };

  const toggleConnectMode = () => {
    if (isConnectMode) {
      stopConnecting();
      return;
    }
    setIsConnectMode(true);
    setSourceEntityId(null);
  };

  const handleEntityCreation = () => {
    onCreateEntity(newEntityName);
    setNewEntityName('');
  };

  const handleCanvasDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveCanvasElement(event.target)) {
      return;
    }
    onCreateEntity(resolveEntityNameForCreation(newEntityName));
    setNewEntityName('');
    setSelectedRelationshipId(null);
  };

  const handleEntityDoubleClick = (
    event: MouseEvent<HTMLDivElement>,
    entityId: string
  ) => {
    event.stopPropagation();
    setSelectedEntityId(entityId);
    const action = resolveDoubleClickRelationshipAction(sourceEntityId, entityId);
    if (!action.shouldCreateRelationship || !action.relationshipSourceEntityId) {
      setSourceEntityId(action.nextSourceEntityId);
      return;
    }
    onCreateRelationship(action.relationshipSourceEntityId, entityId);
    stopConnecting();
  };

  const handleAutoOrganizeLayout = () => {
    setLayout(createAutoLayout(diagram.entities, canvasMetrics));
    const viewportElement = canvasViewportRef.current;
    if (!viewportElement) {
      return;
    }
    viewportElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleZoomIn = () => {
    setZoomLevel((currentZoomLevel) => clampZoomLevel(currentZoomLevel + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    setZoomLevel((currentZoomLevel) => clampZoomLevel(currentZoomLevel - ZOOM_STEP));
  };

  const handleResetZoom = () => {
    setZoomLevel(DEFAULT_ZOOM_LEVEL);
  };

  const startEntityRename = (event: MouseEvent, entityId: string) => {
    event.stopPropagation();
    const entity = diagram.entities.find((item) => item.id === entityId);
    if (!entity) {
      return;
    }
    setEditingEntityId(entityId);
    setEditingEntityName(entity.name);
    setSelectedEntityId(entityId);
  };

  const commitEntityRename = () => {
    if (!editingEntityId) {
      return;
    }
    const nextName = editingEntityName.trim();
    if (nextName.length > 0) {
      onRenameEntity(editingEntityId, nextName);
    }
    setEditingEntityId(null);
    setEditingEntityName('');
  };

  const cancelEntityRename = () => {
    setEditingEntityId(null);
    setEditingEntityName('');
  };

  const handleEntitySelection = (entityId: string) => {
    setSelectedEntityId(entityId);
    if (!isConnectMode) {
      return;
    }
    if (!sourceEntityId) {
      setSourceEntityId(entityId);
      return;
    }
    onCreateRelationship(sourceEntityId, entityId);
    stopConnecting();
  };

  const createDraftKey = (relationshipId: string, entityId: string): string =>
    `${relationshipId}:${entityId}`;

  const parseDraftCardinality = (minDraft: string, maxDraft: string): { min: number; max: number | '*' } | null => {
    const min = Number(minDraft);
    if (!Number.isInteger(min) || min < 0) {
      return null;
    }
    const maxToken = maxDraft.trim();
    if (maxToken === '*') {
      return { min, max: '*' };
    }
    const max = Number(maxToken);
    if (!Number.isInteger(max) || max < min) {
      return null;
    }
    return { min, max };
  };

  const handleCardinalityDraftChange = (
    relationshipId: string,
    participantEntityId: string,
    field: 'min' | 'max',
    value: string
  ) => {
    const draftKey = createDraftKey(relationshipId, participantEntityId);
    setCardinalityDrafts((previousDrafts) => {
      const previous = previousDrafts[draftKey] ?? { min: '', max: '' };
      return {
        ...previousDrafts,
        [draftKey]: {
          ...previous,
          [field]: value
        }
      };
    });
  };

  const handleCardinalitySave = (relationshipId: string, participantEntityId: string) => {
    const draftKey = createDraftKey(relationshipId, participantEntityId);
    const draft = cardinalityDrafts[draftKey];
    if (!draft) {
      return;
    }
    const parsed = parseDraftCardinality(draft.min, draft.max);
    if (!parsed) {
      return;
    }
    onUpdateRelationshipCardinality(relationshipId, participantEntityId, parsed);
  };

  const selectRelationship = (relationshipId: string) => {
    setSelectedRelationshipId(relationshipId);
    setFocusedRelationshipId(relationshipId);
  };

  const startRelationshipRename = (event: MouseEvent<SVGElement>, relationshipId: string) => {
    event.stopPropagation();
    const relationship = diagram.relationships.find((item) => item.id === relationshipId);
    if (!relationship) {
      return;
    }
    selectRelationship(relationshipId);
    setEditingRelationshipId(relationshipId);
    setEditingRelationshipName(relationship.name);
  };

  const commitRelationshipRename = () => {
    if (!editingRelationshipId) {
      return;
    }
    const nextName = editingRelationshipName.trim();
    if (nextName.length > 0) {
      onRenameRelationship(editingRelationshipId, nextName);
    }
    setEditingRelationshipId(null);
    setEditingRelationshipName('');
  };

  const cancelRelationshipRename = () => {
    setEditingRelationshipId(null);
    setEditingRelationshipName('');
  };

  const handleConnectionKeyboardSelection = (
    event: ReactKeyboardEvent<SVGElement>,
    relationshipId: string
  ) => {
    if (!isEditableActivationKey(event)) {
      return;
    }
    event.preventDefault();
    selectRelationship(relationshipId);
  };

  const handleRelationshipDeleteKey = (
    event: ReactKeyboardEvent<SVGElement>,
    relationshipId: string
  ) => {
    if (event.key !== 'Delete') {
      return;
    }
    event.preventDefault();
    onRemoveRelationship(relationshipId);
    setSelectedRelationshipId((currentId) => (currentId === relationshipId ? null : currentId));
    setFocusedRelationshipId((currentId) => (currentId === relationshipId ? null : currentId));
    if (editingRelationshipId === relationshipId) {
      cancelRelationshipRename();
    }
  };

  const handleEntityDeleteKey = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    entityId: string
  ) => {
    if (event.key !== 'Delete') {
      return;
    }
    event.preventDefault();
    onRemoveEntity(entityId);
    setSelectedEntityId((currentId) => (currentId === entityId ? null : currentId));
    setFocusedEntityId((currentId) => (currentId === entityId ? null : currentId));
    if (editingEntityId === entityId) {
      cancelEntityRename();
    }
  };

  const handleAddRelationshipAttribute = () => {
    if (!selectedRelationship) {
      return;
    }
    onUpsertRelationshipAttribute(
      selectedRelationship.id,
      newRelationshipAttributeName,
      newRelationshipAttributeType
    );
    setNewRelationshipAttributeName('');
    setNewRelationshipAttributeType(DEFAULT_RELATIONSHIP_ATTRIBUTE_TYPE);
  };

  const handleNodePointerDown = (
    event: PointerEvent<HTMLDivElement>,
    entityId: string
  ) => {
    if (editingEntityId === entityId) {
      return;
    }
    const currentPosition = layout[entityId];
    if (!currentPosition) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragSessionRef.current = {
      entityId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: currentPosition.x,
      originY: currentPosition.y
    };
    dragMovedRef.current = false;
  };

  const handleNodePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragSession = dragSessionRef.current;
    if (!dragSession || dragSession.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = (event.clientX - dragSession.startX) / zoomLevel;
    const deltaY = (event.clientY - dragSession.startY) / zoomLevel;
    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      dragMovedRef.current = true;
    }
    const unclampedPosition = {
      x: dragSession.originX + deltaX,
      y: dragSession.originY + deltaY
    };
    const nextPosition = clampPosition(unclampedPosition, canvasSize.width, canvasSize.height, canvasMetrics);
    setLayout((previousLayout) => ({
      ...previousLayout,
      [dragSession.entityId]: nextPosition
    }));
  };

  const handleNodePointerUp = (
    event: PointerEvent<HTMLDivElement>,
    entityId: string
  ) => {
    const dragSession = dragSessionRef.current;
    if (!dragSession || dragSession.pointerId !== event.pointerId) {
      return;
    }
    dragSessionRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!dragMovedRef.current) {
      handleEntitySelection(entityId);
    }
    if (typeof window !== 'undefined') {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
      const pendingLayout = pendingLayoutRef.current;
      if (pendingLayout && pendingLayout !== persistedLayoutRef.current) {
        try {
          window.localStorage.setItem(LAYOUT_STORAGE_KEY, pendingLayout);
          persistedLayoutRef.current = pendingLayout;
        } catch {
          pendingLayoutRef.current = pendingLayout;
        }
      }
    }
    dragMovedRef.current = false;
  };

  const zoomPercentageLabel = `${Math.round(zoomLevel * 100)}%`;
  const canZoomIn = zoomLevel < MAX_ZOOM_LEVEL - ZOOM_TOLERANCE;
  const canZoomOut = zoomLevel > MIN_ZOOM_LEVEL + ZOOM_TOLERANCE;
  const canResetZoom = Math.abs(zoomLevel - DEFAULT_ZOOM_LEVEL) > ZOOM_TOLERANCE;

  return (
    <section aria-label="Canvas do diagrama" className="diagram-canvas-panel">
      <div className="diagram-toolbar">
        <label htmlFor="new-entity-name">Nova entidade</label>
        <input
          id="new-entity-name"
          type="text"
          value={newEntityName}
          onChange={(event) => setNewEntityName(event.target.value)}
          placeholder="Ex.: Produto"
        />
        <button type="button" onClick={handleEntityCreation}>
          Criar entidade
        </button>
        <button type="button" className={isConnectMode ? 'is-active' : ''} onClick={toggleConnectMode}>
          {isConnectMode ? 'Cancelar conexão' : 'Conectar entidades'}
        </button>
        <button type="button" onClick={handleAutoOrganizeLayout}>
          Auto-organizar
        </button>
        <div className="diagram-zoom-controls" role="group" aria-label="Controles de zoom">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={!canZoomOut}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
          >
            -
          </button>
          <span className="diagram-zoom-level" aria-live="polite">
            Zoom: {zoomPercentageLabel}
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            disabled={!canResetZoom}
            aria-label="Resetar zoom"
            title="Resetar zoom"
          >
            Padrão
          </button>
        </div>
        <span className="diagram-toolbar-hint">
          {sourceEntityId
            ? 'Selecione ou dê duplo clique na entidade de destino para concluir a conexão.'
            : 'Dê duplo clique em área vazia para criar entidade; use duplo clique em duas entidades para criar relacionamento.'}
        </span>
      </div>

      <div ref={canvasViewportRef} className="diagram-canvas-viewport" onDoubleClick={handleCanvasDoubleClick}>
        <div
          className="diagram-canvas-stage"
          style={{ width: canvasSize.width * zoomLevel, height: canvasSize.height * zoomLevel }}
        >
          <div
            className="diagram-canvas"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left'
            }}
          >
          <svg className="diagram-connections" width={canvasSize.width} height={canvasSize.height} aria-hidden>
            {specializationSegments.map((segment) => {
              const startX = segment.subCenter.x;
              const startY = segment.subCenter.y - canvasMetrics.nodeHeight / 2;
              const endX = segment.superCenter.x;
              const endY = segment.superCenter.y + canvasMetrics.nodeHeight / 2;
              const labelX = (startX + endX) / 2;
              const labelY = (startY + endY) / 2 - 8;
              return (
                <g key={`specialization-${segment.id}`} className="diagram-specialization">
                  <line
                    className="diagram-specialization-line"
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    markerEnd="url(#diagram-generalization-arrow)"
                  />
                  <text className="diagram-specialization-label" x={labelX} y={labelY} textAnchor="middle">
                    é-um
                  </text>
                </g>
              );
            })}
            {relationshipSegments.map((segment) => {
              const isSelected = selectedRelationshipId === segment.id;
              const isFocused = focusedRelationshipId === segment.id;
              const connectionStateClassName = [
                'diagram-connection',
                isSelected ? 'is-selected' : '',
                isFocused ? 'is-focused' : ''
              ]
                .filter(Boolean)
                .join(' ');

              if (segment.type === 'occurrence') {
                const diamondSize = 30;
                const diamondPoints = `${segment.center.x},${segment.center.y - diamondSize} ${segment.center.x + diamondSize},${segment.center.y} ${segment.center.x},${segment.center.y + diamondSize} ${segment.center.x - diamondSize},${segment.center.y}`;
                const labelX = segment.center.x;
                const labelY = segment.center.y + diamondSize + 16;

                return (
                  <g key={segment.id} className={connectionStateClassName}>
                    {segment.participantCenters.map((pc, index) => {
                      const participantLabel = `${pc.participant.min}..${pc.participant.max}`;
                      const variant = getCardinalityVisualVariant(pc.participant);
                      
                      // Calculate direction vector from entity to diamond
                      const dx = segment.center.x - pc.center.x;
                      const dy = segment.center.y - pc.center.y;
                      const length = Math.sqrt(dx * dx + dy * dy);
                      const nx = length > 0 ? dx / length : 0;
                      const ny = length > 0 ? dy / length : 0;
                      
                      // Place cardinality label near the entity
                      const cardX = pc.center.x + nx * 50;
                      const cardY = pc.center.y + ny * 50 - 8;

                      return (
                        <g key={`${segment.id}-line-${index}`}>
                          <line
                            className="diagram-connection-line"
                            x1={pc.center.x}
                            y1={pc.center.y}
                            x2={segment.center.x}
                            y2={segment.center.y}
                            strokeWidth={isSelected ? 3 : 2}
                          />
                          <text
                            className={`diagram-cardinality-label ${variant}`}
                            x={cardX}
                            y={cardY}
                            textAnchor="middle"
                          >
                            {participantLabel}
                          </text>
                        </g>
                      );
                    })}
                    
                    <polygon
                      points={diamondPoints}
                      fill="#f8fafc"
                      stroke={RELATIONSHIP_COLOR}
                      strokeWidth={isSelected ? 3 : 2}
                      className="diagram-occurrence-node"
                      onClick={() => selectRelationship(segment.id)}
                      onDoubleClick={(event) => startRelationshipRename(event, segment.id)}
                      onFocus={() => setFocusedRelationshipId(segment.id)}
                      onBlur={() =>
                        setFocusedRelationshipId((currentFocusedId) =>
                          currentFocusedId === segment.id ? null : currentFocusedId
                        )
                      }
                      onKeyDown={(event) => {
                        handleConnectionKeyboardSelection(event, segment.id);
                        handleRelationshipDeleteKey(event, segment.id);
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ocorrência ${segment.name}`}
                      aria-pressed={isSelected}
                    />

                    <text
                      className="diagram-connection-label"
                      x={labelX}
                      y={labelY}
                      fontSize={12}
                      textAnchor="middle"
                      onClick={() => selectRelationship(segment.id)}
                      onDoubleClick={(event) => startRelationshipRename(event, segment.id)}
                      onFocus={() => setFocusedRelationshipId(segment.id)}
                      onBlur={() =>
                        setFocusedRelationshipId((currentFocusedId) =>
                          currentFocusedId === segment.id ? null : currentFocusedId
                        )
                      }
                      onKeyDown={(event) => {
                        handleConnectionKeyboardSelection(event, segment.id);
                        handleRelationshipDeleteKey(event, segment.id);
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      {segment.name}
                    </text>
                  </g>
                );
              }

              const sourceParticipant = segment.participants[0] ?? { min: 0, max: '*' as const };
              const targetParticipant = segment.participants[1] ?? { min: 0, max: '*' as const };
              const isSelfLoop = segment.sourceEntityId === segment.targetEntityId;
              const selfLoopGeometry = isSelfLoop
                ? createSelfLoopGeometry(segment.sourceCenter, canvasMetrics)
                : null;
              const labelX = selfLoopGeometry
                ? selfLoopGeometry.labelX
                : (segment.sourceCenter.x + segment.targetCenter.x) / 2;
              const labelY = selfLoopGeometry
                ? selfLoopGeometry.labelY
                : (segment.sourceCenter.y + segment.targetCenter.y) / 2 - canvasMetrics.relationshipLabelOffset;
              const sourceCardinalityLabel = `${sourceParticipant.min}..${sourceParticipant.max}`;
              const targetCardinalityLabel = `${targetParticipant.min}..${targetParticipant.max}`;
              const relationshipCardinalityLabel = `(${sourceCardinalityLabel} ↔ ${targetCardinalityLabel})`;
              const sourceCardinalityX = selfLoopGeometry
                ? selfLoopGeometry.sourceCardinalityX
                : segment.sourceCenter.x + 12;
              const sourceCardinalityY = selfLoopGeometry
                ? selfLoopGeometry.sourceCardinalityY
                : segment.sourceCenter.y - 8;
              const targetCardinalityX = selfLoopGeometry
                ? selfLoopGeometry.targetCardinalityX
                : segment.targetCenter.x - 12;
              const targetCardinalityY = selfLoopGeometry
                ? selfLoopGeometry.targetCardinalityY
                : segment.targetCenter.y - 8;
              const sourceDirectionX =
                selfLoopGeometry?.sourceDirectionX ??
                segment.sourceCenter.x + canvasMetrics.relationshipEndpointOffset;
              const sourceDirectionY = selfLoopGeometry?.sourceDirectionY ?? segment.sourceCenter.y + 18;
              const targetDirectionX =
                selfLoopGeometry?.targetDirectionX ??
                segment.targetCenter.x - canvasMetrics.relationshipEndpointOffset;
              const targetDirectionY = selfLoopGeometry?.targetDirectionY ?? segment.targetCenter.y + 18;
              const sourceVariant = getCardinalityVisualVariant(sourceParticipant);
              const targetVariant = getCardinalityVisualVariant(targetParticipant);
              return (
                <g key={segment.id} className={connectionStateClassName}>
                  {isSelfLoop && selfLoopGeometry ? (
                    <>
                      <path
                        className="diagram-connection-hit-area"
                        d={selfLoopGeometry.path}
                        fill="none"
                        onClick={() => selectRelationship(segment.id)}
                        onDoubleClick={(event) => startRelationshipRename(event, segment.id)}
                        onFocus={() => setFocusedRelationshipId(segment.id)}
                        onBlur={() =>
                          setFocusedRelationshipId((currentFocusedId) =>
                            currentFocusedId === segment.id ? null : currentFocusedId
                          )
                        }
                        onKeyDown={(event) => {
                          handleConnectionKeyboardSelection(event, segment.id);
                          handleRelationshipDeleteKey(event, segment.id);
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Relacionamento ${segment.name}. Origem ${segment.participants[0]?.entityName ?? ''}, destino ${segment.participants[1]?.entityName ?? ''}.`}
                        aria-pressed={isSelected}
                      />
                      <path
                        className="diagram-connection-line is-self-loop"
                        d={selfLoopGeometry.path}
                        fill="none"
                        strokeWidth={isSelected ? 3 : 2}
                        markerEnd="url(#diagram-arrow)"
                      />
                    </>
                  ) : (
                    <>
                      <line
                        className="diagram-connection-hit-area"
                        x1={segment.sourceCenter.x}
                        y1={segment.sourceCenter.y}
                        x2={segment.targetCenter.x}
                        y2={segment.targetCenter.y}
                        onClick={() => selectRelationship(segment.id)}
                        onDoubleClick={(event) => startRelationshipRename(event, segment.id)}
                        onFocus={() => setFocusedRelationshipId(segment.id)}
                        onBlur={() =>
                          setFocusedRelationshipId((currentFocusedId) =>
                            currentFocusedId === segment.id ? null : currentFocusedId
                          )
                        }
                        onKeyDown={(event) => {
                          handleConnectionKeyboardSelection(event, segment.id);
                          handleRelationshipDeleteKey(event, segment.id);
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Relacionamento ${segment.name}. Origem ${segment.participants[0]?.entityName ?? ''}, destino ${segment.participants[1]?.entityName ?? ''}.`}
                        aria-pressed={isSelected}
                      />
                      <line
                        className="diagram-connection-line"
                        x1={segment.sourceCenter.x}
                        y1={segment.sourceCenter.y}
                        x2={segment.targetCenter.x}
                        y2={segment.targetCenter.y}
                        strokeWidth={isSelected ? 3 : 2}
                        markerEnd="url(#diagram-arrow)"
                      />
                    </>
                  )}
                  <text
                    className="diagram-connection-label"
                    x={labelX}
                    y={labelY}
                    fontSize={12}
                    textAnchor="middle"
                    onClick={() => selectRelationship(segment.id)}
                    onDoubleClick={(event) => startRelationshipRename(event, segment.id)}
                    onFocus={() => setFocusedRelationshipId(segment.id)}
                    onBlur={() =>
                      setFocusedRelationshipId((currentFocusedId) =>
                        currentFocusedId === segment.id ? null : currentFocusedId
                      )
                    }
                    onKeyDown={(event) => {
                      handleConnectionKeyboardSelection(event, segment.id);
                      handleRelationshipDeleteKey(event, segment.id);
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Selecionar relacionamento ${segment.name}`}
                  >
                    {segment.name}
                    <tspan className="diagram-connection-cardinality-inline" x={labelX} dy={14}>
                      {relationshipCardinalityLabel}
                    </tspan>
                  </text>
                  <text
                    className={`diagram-cardinality-label ${sourceVariant}`}
                    x={sourceCardinalityX}
                    y={sourceCardinalityY}
                  >
                    {sourceCardinalityLabel}
                  </text>
                  <text
                    className={`diagram-cardinality-label ${targetVariant}`}
                    x={targetCardinalityX}
                    y={targetCardinalityY}
                    textAnchor="end"
                  >
                    {targetCardinalityLabel}
                  </text>
                  <text className="diagram-direction-label is-source" x={sourceDirectionX} y={sourceDirectionY}>
                    origem
                  </text>
                  <text
                    className="diagram-direction-label is-target"
                    x={targetDirectionX}
                    y={targetDirectionY}
                    textAnchor="end"
                  >
                    destino
                  </text>
                </g>
              );
            })}
            <defs>
              <marker
                id="diagram-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" fill={RELATIONSHIP_COLOR} />
              </marker>
              <marker
                id="diagram-generalization-arrow"
                markerWidth="12"
                markerHeight="12"
                refX="10"
                refY="6"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,6 L10,0 L10,12 z" fill="#ffffff" stroke={GENERALIZATION_COLOR} strokeWidth="1.5" />
              </marker>
            </defs>
          </svg>

            {diagram.entities.map((entity) => {
            const position = layout[entity.id] ?? createDefaultPosition(0, canvasMetrics);
            const isSource = sourceEntityId === entity.id;
            const isEntitySelected = selectedEntityId === entity.id;
            const isEntityFocused = focusedEntityId === entity.id;
            const entityClassName = [
              'entity-node',
              isSource ? 'is-source' : '',
              isEntitySelected ? 'is-selected' : '',
              isEntityFocused ? 'is-focused' : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={entity.id}
                role="button"
                tabIndex={0}
                className={entityClassName}
                style={{
                  left: position.x,
                  top: position.y,
                  width: canvasMetrics.nodeWidth,
                  minHeight: canvasMetrics.nodeHeight
                }}
                onPointerDown={(event) => handleNodePointerDown(event, entity.id)}
                onPointerMove={handleNodePointerMove}
                onPointerUp={(event) => handleNodePointerUp(event, entity.id)}
                onDoubleClick={(event) => handleEntityDoubleClick(event, entity.id)}
                onFocus={() => setFocusedEntityId(entity.id)}
                onBlur={() => setFocusedEntityId((current) => (current === entity.id ? null : current))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleEntitySelection(entity.id);
                  }
                  handleEntityDeleteKey(event, entity.id);
                }}
                aria-label={`Entidade ${entity.name}`}
                aria-pressed={selectedEntityId === entity.id}
              >
                {editingEntityId === entity.id ? (
                  <input
                    type="text"
                    value={editingEntityName}
                    autoFocus
                    onChange={(event) => setEditingEntityName(event.target.value)}
                    onBlur={commitEntityRename}
                    onPointerDown={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitEntityRename();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelEntityRename();
                      }
                    }}
                    aria-label={`Renomear entidade ${entity.name}`}
                  />
                ) : (
                  <strong onDoubleClick={(event) => startEntityRename(event, entity.id)}>{entity.name}</strong>
                )}
                <ul>
                  {entity.attributes.map((attribute) => (
                    <li key={`${entity.id}-${attribute.name}`}>
                      {attribute.name}: {attribute.dataType}
                      {attribute.isIdentifier ? ' (ID)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {selectedRelationship ? (
        <section aria-label="Inspetor de relacionamento" className="relationship-editor-panel">
          <h3>Edição do relacionamento: {selectedRelationship.name}</h3>
          <div className="relationship-rename-editor">
            <label htmlFor="relationship-rename-input">Nome do relacionamento</label>
            <input
              id="relationship-rename-input"
              type="text"
              value={
                editingRelationshipId === selectedRelationship.id
                  ? editingRelationshipName
                  : selectedRelationship.name
              }
              onFocus={() => {
                if (editingRelationshipId !== selectedRelationship.id) {
                  setEditingRelationshipId(selectedRelationship.id);
                  setEditingRelationshipName(selectedRelationship.name);
                }
              }}
              onChange={(event) => {
                setEditingRelationshipId(selectedRelationship.id);
                setEditingRelationshipName(event.target.value);
              }}
              onBlur={commitRelationshipRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRelationshipRename();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRelationshipRename();
                }
              }}
            />
          </div>
          <div className="relationship-editor-grid">
            {selectedRelationship.participants.map((participant) => {
              const draftKey = createDraftKey(selectedRelationship.id, participant.entityId);
              const draft =
                cardinalityDrafts[draftKey] ?? {
                  min: String(participant.min),
                  max: String(participant.max)
                };
              const parsedCardinality = parseDraftCardinality(draft.min, draft.max);
              const isDirty =
                draft.min !== String(participant.min) || draft.max !== String(participant.max);
              const participantEditorClassName = [
                'relationship-participant-editor',
                isDirty ? 'is-editing' : '',
                !parsedCardinality ? 'is-invalid' : ''
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div key={draftKey} className={participantEditorClassName}>
                  <strong>{participant.entityName}</strong>
                  <label htmlFor={`cardinality-min-${draftKey}`}>Cardinalidade mínima</label>
                  <input
                    id={`cardinality-min-${draftKey}`}
                    type="number"
                    min={0}
                    step={1}
                    value={draft.min}
                    onChange={(event) =>
                      handleCardinalityDraftChange(
                        selectedRelationship.id,
                        participant.entityId,
                        'min',
                        event.target.value
                      )
                    }
                  />
                  <label htmlFor={`cardinality-max-${draftKey}`}>Cardinalidade máxima (número ou *)</label>
                  <input
                    id={`cardinality-max-${draftKey}`}
                    type="text"
                    value={draft.max}
                    onChange={(event) =>
                      handleCardinalityDraftChange(
                        selectedRelationship.id,
                        participant.entityId,
                        'max',
                        event.target.value
                      )
                    }
                  />
                  <button
                    type="button"
                    disabled={!parsedCardinality}
                    onClick={() => handleCardinalitySave(selectedRelationship.id, participant.entityId)}
                  >
                    Salvar cardinalidade
                  </button>
                  {!parsedCardinality ? (
                    <p className="relationship-participant-feedback" role="status">
                      Valor inválido. Use min inteiro ≥ 0 e max ≥ min ou *.
                    </p>
                  ) : null}
                  {isDirty && parsedCardinality ? (
                    <p className="relationship-participant-feedback is-editing" role="status">
                      Alterações pendentes para esta cardinalidade.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="relationship-attributes-editor">
            <h4>Atributos do relacionamento</h4>
            <ul>
              {selectedRelationship.attributes.map((attribute) => (
                <li key={`${selectedRelationship.id}-${attribute.name}`}>
                  {attribute.name}: {attribute.dataType}
                  <button
                    type="button"
                    onClick={() => onRemoveRelationshipAttribute(selectedRelationship.id, attribute.name)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
            <div className="relationship-attributes-form">
              <label htmlFor="new-relationship-attribute-name">Novo atributo</label>
              <input
                id="new-relationship-attribute-name"
                type="text"
                value={newRelationshipAttributeName}
                onChange={(event) => setNewRelationshipAttributeName(event.target.value)}
                placeholder="Ex.: dataCriacao"
              />
              <label htmlFor="new-relationship-attribute-type">Tipo</label>
              <input
                id="new-relationship-attribute-type"
                type="text"
                value={newRelationshipAttributeType}
                onChange={(event) => setNewRelationshipAttributeType(event.target.value)}
                placeholder="Ex.: DATETIME"
              />
              <button
                type="button"
                onClick={handleAddRelationshipAttribute}
                disabled={newRelationshipAttributeName.trim().length === 0}
              >
                Adicionar atributo
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
