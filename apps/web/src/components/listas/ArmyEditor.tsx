/**
 * ArmyEditor — el editor principal de la lista.
 * Maneja: agregar/quitar unidades, ajustar modelos, ver validación.
 */
import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { KBUnit, List, ListUnit } from '@dobleuno/shared';

import { Button } from '../ui/Button.js';
import { UnitRow } from './UnitRow.js';
import { UnitPickerModal } from './UnitPickerModal.js';
import { CompositionValidator } from './CompositionValidator.js';
import { ListSummary } from './ListSummary.js';
import { validateList, computeListTotal } from '../../lib/list-validation.js';
import { downloadList } from '../../lib/list-export.js';
import { listsApi } from '../../lib/lists-api.js';
import { useUIStore } from '../../lib/store.js';

interface ArmyEditorProps {
  initialList: List;
  onSaved?: (id: string) => void;
}

export function ArmyEditor({ initialList, onSaved }: ArmyEditorProps) {
  const [list, setList] = useState<List>(initialList);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    const total = computeListTotal(list);
    if (total !== list.totalPoints) {
      setList((prev) => ({ ...prev, totalPoints: total }));
    }
  }, [list.units, list.totalPoints]);

  const validation = useMemo(() => validateList(list), [list]);

  function addUnit(unit: KBUnit): void {
    const lu: ListUnit = {
      id: `${unit.id}-${Math.random().toString(36).slice(2, 7)}`,
      ref: unit.id,
      name: unit.name,
      category: unit.category,
      points: unit.pointsPerModel
        ? unit.pointsPerModel * (unit.minSize || 1)
        : unit.pointsFixed ?? 0,
      models: unit.minSize,
      commandGroup: {},
      options: [],
      magicItems: [],
    };
    setList((prev) => ({ ...prev, units: [...prev.units, lu] }));
    setDirty(true);
    setPickerOpen(false);
  }

  function updateUnit(u: ListUnit): void {
    setList((prev) => ({ ...prev, units: prev.units.map((x) => (x.id === u.id ? u : x)) }));
    setDirty(true);
  }

  function removeUnit(id: string): void {
    setList((prev) => ({ ...prev, units: prev.units.filter((u) => u.id !== id) }));
    setDirty(true);
  }

  async function save(): Promise<void> {
    setSaving(true);
    try {
      let res;
      if (list.id && list.id !== 'new') {
        res = await listsApi.update(list.id, list);
      } else {
        const created = await listsApi.create(list);
        res = created;
        if (onSaved && 'list' in created && (created as { list: { id: string } }).list?.id) {
          onSaved((created as { list: { id: string } }).list.id);
        }
      }
      if ('validation' in res && !res.validation.valid) {
        showToast(`Guardado con ${res.validation.errors.length} error(es) de validación`, 'error');
      } else {
        showToast('Lista guardada', 'success');
        setDirty(false);
      }
    } catch (err) {
      showToast('Error al guardar: ' + (err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const byCategory = {
    lord: list.units.filter((u) => u.category === 'lord'),
    hero: list.units.filter((u) => u.category === 'hero'),
    core: list.units.filter((u) => u.category === 'core'),
    special: list.units.filter((u) => u.category === 'special'),
    rare: list.units.filter((u) => u.category === 'rare'),
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={list.name}
          onChange={(e) => {
            setList((prev) => ({ ...prev, name: e.target.value }));
            setDirty(true);
          }}
          className="flex-1 rounded-lg bg-forge-2 px-3 py-2 font-serif text-xl text-parchment-50 focus:outline-none focus:ring-2 focus:ring-blood-500/40"
        />
      </div>

      {(['lord', 'hero', 'core', 'special', 'rare'] as const).map((cat) => (
        <section key={cat} className="space-y-2">
          <header className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-parchment-300">
              {cat} ({byCategory[cat].length})
            </h2>
          </header>
          {byCategory[cat].map((u) => (
            <UnitRow key={u.id} unit={u} onUpdate={updateUnit} onRemove={() => removeUnit(u.id)} />
          ))}
        </section>
      ))}

      <Button variant="primary" size="lg" fullWidth onClick={() => setPickerOpen(true)}>
        <Plus size={18} /> Añadir unidad
      </Button>

      <div className="rounded-xl border border-forge-3 bg-forge-1 p-3">
        <h3 className="mb-2 text-xs uppercase tracking-widest text-parchment-300">Composición</h3>
        <CompositionValidator validation={validation} totalPoints={list.totalPoints} />
      </div>

      <ListSummary
        list={list}
        canSave={dirty}
        saving={saving}
        onSave={save}
        onExport={() => downloadList(list, 'json')}
      />

      {pickerOpen && (
        <UnitPickerModal
          faction={list.faction}
          onSelect={addUnit}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
