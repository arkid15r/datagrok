import {distance} from 'fastest-levenshtein';
import {mmDistanceFunctionType} from './types';

export function levenstein(): mmDistanceFunctionType {
  return (seq1: string, seq2: string) => {
    return distance(seq1, seq2);
  };
}
