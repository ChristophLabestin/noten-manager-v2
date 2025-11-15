import { useState, type CSSProperties, type HTMLAttributes } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Grade } from "../interfaces/Grade";
import type { Subject } from "../interfaces/Subject";
import { navigate } from "../services/navigation";

interface SubjectsTableProps {
  subjects: Subject[];
  subjectGrades: { [key: string]: Grade[] }; // kommt direkt aus Home
  enableDrag?: boolean;
  onReorder?: (newOrder: string[]) => void;
}

const calculateGradeWeight = (subject: Subject, grade: Grade): number => {
  if (!subject) return 1; // Default

  const type = subject.type;

  if (type === 1) {
    // Hauptfach
    return grade.weight === 3 ? 2 : grade.weight === 2 ? 2 : 1;
  }

  if (type === 0) {
    // Nebenfach
    return grade.weight === 3 ? 2 : grade.weight === 1 ? 2 : 1;
  }

  return 1; // Default
};

const calculateAverageScore = (
  subject: Subject,
  grades: Grade[]
): number | null => {
  if (!grades || grades.length === 0) return null;

  const total = grades.reduce(
    (acc, grade) => acc + grade.grade * calculateGradeWeight(subject, grade),
    0
  );
  const totalWeight = grades.reduce(
    (acc, grade) => acc + calculateGradeWeight(subject, grade),
    0
  );

  if (totalWeight === 0) return null;
  return total / totalWeight;
};

const formatAverage = (value: number | null): string =>
  value === null ? "–" : value.toFixed(2);

const getGradeClass = (value: number | null): string => {
  if (value === null) return "";
  if (value >= 7) return "good";
  if (value >= 4) return "medium";
  return "bad";
};

export default function SubjectsTable({
  subjects,
  subjectGrades,
  enableDrag = false,
  onReorder,
}: SubjectsTableProps) {
  const goToSubjectPage = (subjectId: string) => {
    navigate(`/fach/${subjectId}`);
  };

  const subjectIds = subjects.map((subject) => subject.name);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subjectIds.indexOf(active.id as string);
    const newIndex = subjectIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(subjectIds, oldIndex, newIndex);
    if (onReorder) {
      onReorder(newOrder);
    }
  };

  if (!enableDrag || !onReorder) {
    return (
      <div className="subjects-list">
        {subjects.map((subject) => {
          const grades = subjectGrades[subject.name] || [];
          return (
            <SubjectRow
              key={subject.name}
              subject={subject}
              grades={grades}
              onClick={() => goToSubjectPage(subject.name)}
              showHandle={false}
            />
          );
        })}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={subjectIds}>
        <div className="subjects-list">
          {subjects.map((subject) => {
            const grades = subjectGrades[subject.name] || [];
            return (
              <SortableSubjectRow
                key={subject.name}
                subject={subject}
                grades={grades}
                onClick={() => goToSubjectPage(subject.name)}
                activeId={activeId}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SubjectRowProps {
  subject: Subject;
  grades: Grade[];
  onClick: () => void;
  showHandle: boolean;
  isDragging?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  style?: CSSProperties;
  innerRef?: (node: HTMLButtonElement | null) => void;
}

function SubjectRow({
  subject,
  grades,
  onClick,
  showHandle,
  isDragging = false,
  dragHandleProps,
  style,
  innerRef,
}: SubjectRowProps) {
  const avg = calculateAverageScore(subject, grades);
  const gradesCount = grades.length;

  return (
    <button
      type="button"
      className={
        isDragging ? "subject-row subject-row--dragging" : "subject-row"
      }
      onClick={onClick}
      ref={innerRef}
      style={style}
    >
      <div className="subject-row-left">
        {showHandle && (
          <div
            className="subject-row-drag-handle"
            {...dragHandleProps}
            onClick={(event) => event.stopPropagation()}
          >
            ⋮⋮
          </div>
        )}
        <div className="subject-row-main">
          <div className="subject-row-name">{subject.name}</div>
          <div className="subject-row-meta">
            <span
              className={`subject-tag ${
                subject.type === 1
                  ? "subject-tag--main"
                  : "subject-tag--minor"
              }`}
            >
              {subject.type === 1 ? "Hauptfach" : "Nebenfach"}
            </span>
            <span className="subject-row-count">
              {gradesCount} {gradesCount === 1 ? "Note" : "Noten"}
            </span>
          </div>
        </div>
      </div>
      <div className="subject-row-grade">
        <div
          className={`subject-detail-summary-pill ${getGradeClass(avg)}`}
        >
          {formatAverage(avg)}
        </div>
      </div>
    </button>
  );
}

interface SortableSubjectRowProps {
  subject: Subject;
  grades: Grade[];
  onClick: () => void;
  activeId: string | null;
}

function SortableSubjectRow({
  subject,
  grades,
  onClick,
  activeId,
}: SortableSubjectRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.name });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  const handleProps: HTMLAttributes<HTMLDivElement> = {
    ...attributes,
    ...listeners,
  };

  return (
    <SubjectRow
      subject={subject}
      grades={grades}
      onClick={onClick}
      showHandle
      isDragging={isDragging || activeId === subject.name}
      dragHandleProps={handleProps}
      style={style}
      innerRef={setNodeRef}
    />
  );
}
