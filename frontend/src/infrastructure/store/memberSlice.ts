import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Member, MemberDayPass } from '@/domain/member/member.types';
import { getMemberStatus, type MemberStatusResult } from '@/application/member/getMemberStatus.usecase';

export type DayPass = MemberDayPass;

export interface MemberState {
  member: Member | null;
  dayPass: MemberDayPass | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: MemberState = {
  member: null,
  dayPass: null,
  isLoading: true,
  error: null,
};

export const fetchMemberStatus = createAsyncThunk<
  MemberStatusResult,
  string,
  { rejectValue: string }
>('member/fetchMemberStatus', async (profileId, { rejectWithValue }) => {
  try {
    const res = await getMemberStatus(profileId);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener la membresía';
    return rejectWithValue(message);
  }
});

export const memberSlice = createSlice({
  name: 'member',
  initialState,
  reducers: {
    setMember(state, action: PayloadAction<Member | null>) {
      state.member = action.payload;
    },
    setDayPass(state, action: PayloadAction<MemberDayPass | null>) {
      state.dayPass = action.payload;
    },
    updateMemberStatus(state, action: PayloadAction<string>) {
      if (state.member) {
        state.member = {
          ...state.member,
          status: action.payload as Member['status'],
        };
      }
    },
    clearMember(state) {
      state.member = null;
      state.dayPass = null;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMemberStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMemberStatus.fulfilled, (state, action) => {
        state.member = action.payload.member;
        state.dayPass = action.payload.dayPass;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchMemberStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Error al cargar membresía';
      });
  },
});

export const { setMember, setDayPass, updateMemberStatus, clearMember } = memberSlice.actions;
export default memberSlice.reducer;
