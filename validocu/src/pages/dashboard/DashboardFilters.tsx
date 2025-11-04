import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
  Chip,
  type SelectChangeEvent,
} from '@mui/material';
import { Filter, X } from 'lucide-react';
import type { DashboardFilters, DashboardFilterOptions } from '../../utils/interfaces';
import { getDashboardFilterOptions } from '../../utils/api';

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

export default function DashboardFiltersComponent({ filters, onFiltersChange }: DashboardFiltersProps) {
  const [options, setOptions] = useState<DashboardFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      setLoading(true);
      const data = await getDashboardFilterOptions();
      setOptions(data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, date_from: event.target.value });
  };

  const handleDateToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, date_to: event.target.value });
  };

  const handleGroupsChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    onFiltersChange({ 
      ...filters, 
      group_ids: typeof value === 'string' ? [] : value 
    });
  };

  const handleUsersChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onFiltersChange({ 
      ...filters, 
      user_ids: typeof value === 'string' ? [] : value 
    });
  };

  const handleDocTypesChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    onFiltersChange({ 
      ...filters, 
      document_type_ids: typeof value === 'string' ? [] : value 
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      date_from: undefined,
      date_to: undefined,
      group_ids: [],
      user_ids: [],
      document_type_ids: [],
    });
  };

  const hasActiveFilters = Boolean(
    filters.date_from ||
    filters.date_to ||
    filters.group_ids?.length ||
    filters.user_ids?.length ||
    filters.document_type_ids?.length
  );

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography>Cargando filtros...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Filter size={24} />
          <Typography variant="h6">Filtros</Typography>
        </Box>
        {hasActiveFilters && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<X size={16} />}
            onClick={clearFilters}
          >
            Limpiar Filtros
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
        {/* Rango de fechas */}
        <TextField
          label="Fecha Desde"
          type="date"
          value={filters.date_from || ''}
          onChange={handleDateFromChange}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="Fecha Hasta"
          type="date"
          value={filters.date_to || ''}
          onChange={handleDateToChange}
          InputLabelProps={{ shrink: true }}
          size="small"
        />

        {/* Grupos */}
        <FormControl size="small">
          <InputLabel>Grupos</InputLabel>
          <Select
            multiple
            value={filters.group_ids || []}
            onChange={handleGroupsChange}
            input={<OutlinedInput label="Grupos" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((id) => (
                  <Chip
                    key={id}
                    label={options?.groups.find((g) => g.id === id)?.name || id}
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {options?.groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                <Checkbox checked={(filters.group_ids || []).indexOf(group.id) > -1} />
                <ListItemText primary={group.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Usuarios */}
        <FormControl size="small">
          <InputLabel>Usuarios</InputLabel>
          <Select
            multiple
            value={filters.user_ids || []}
            onChange={handleUsersChange}
            input={<OutlinedInput label="Usuarios" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((id) => (
                  <Chip
                    key={id}
                    label={options?.users.find((u) => u.id === id)?.name || id}
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {options?.users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                <Checkbox checked={(filters.user_ids || []).indexOf(user.id) > -1} />
                <ListItemText primary={user.name} secondary={user.email} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Tipos de documento */}
        <FormControl size="small">
          <InputLabel>Tipos de Documento</InputLabel>
          <Select
            multiple
            value={filters.document_type_ids || []}
            onChange={handleDocTypesChange}
            input={<OutlinedInput label="Tipos de Documento" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((id) => (
                  <Chip
                    key={id}
                    label={options?.document_types.find((t) => t.id === id)?.name || id}
                    size="small"
                  />
                ))}
              </Box>
            )}
          >
            {options?.document_types.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                <Checkbox checked={(filters.document_type_ids || []).indexOf(type.id) > -1} />
                <ListItemText primary={type.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
}
