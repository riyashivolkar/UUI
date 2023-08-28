import { withMods } from '@epam/uui-core';
import { DropdownContainer as uuiDropdownListContainer, DropdownContainerProps } from '@epam/uui';

export interface DropdownContainerMods {
    color?: 'white' | 'gray70';
}

export function applyDropdownContainerMods(mods: DropdownContainerMods) {
    return [`uui-color-${mods.color || 'white'}`];
}
export const DropdownContainer = withMods<DropdownContainerProps, DropdownContainerMods>(uuiDropdownListContainer, applyDropdownContainerMods);
