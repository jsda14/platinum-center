import os
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status

from src.infrastructure.supabase import supabase_client
from src.api.routes.admin import get_current_user_role

router = APIRouter(tags=["dashboard"])

@router.get("/admin/dashboard/metrics")
async def get_dashboard_metrics(authorization: Optional[str] = Header(None)):
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para realizar esta acción"
        )

    try:
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1).isoformat()

        # a) totalActiveMembers
        active_res = supabase_client.table('members').select('id').eq('status', 'active').execute()
        total_active_members = len(active_res.data) if active_res.data else 0

        # b) monthlyRevenue
        revenue_res = supabase_client.table('payments').select('amount').eq('status', 'confirmed').gte('payment_date', start_of_month).execute()
        monthly_revenue = sum(float(p['amount']) for p in revenue_res.data) if revenue_res.data else 0.0

        # c) expiringThisWeek (members list)
        today_str = now.date().isoformat()
        seven_days_later = (now + timedelta(days=7)).date().isoformat()
        expiring_res = supabase_client.table('members').select('*, profiles:profile_id(full_name, email, phone)').eq('status', 'active').gte('end_date', today_str).lte('end_date', seven_days_later).order('end_date', desc=False).execute()

        expiring_this_week = []
        if expiring_res.data:
            for r in expiring_res.data:
                profile_data = r.get("profiles")
                expiring_this_week.append({
                    "id": r["id"],
                    "plan": r["plan"],
                    "end_date": r["end_date"],
                    "profiles": {
                        "full_name": profile_data.get("full_name") if profile_data else None,
                        "email": profile_data.get("email") if profile_data else None,
                        "phone": profile_data.get("phone") if profile_data else None
                    }
                })

        # d) newMembersThisMonth
        new_res = supabase_client.table('members').select('id').gte('created_at', start_of_month).execute()
        new_members_this_month = len(new_res.data) if new_res.data else 0

        # e) revenueByMonth (last 6 months)
        six_months_ago = datetime(now.year, now.month, 1) - timedelta(days=150)
        six_months_ago = datetime(six_months_ago.year, six_months_ago.month, 1)
        six_months_ago_str = six_months_ago.isoformat()

        payments_res = supabase_client.table('payments').select('amount, payment_date').eq('status', 'confirmed').gte('payment_date', six_months_ago_str).execute()

        month_names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        last_6_months = []
        for i in range(5, -1, -1):
            year = now.year
            month = now.month - i
            while month <= 0:
                month += 12
                year -= 1
            last_6_months.append({
                "year": year,
                "month": month,
                "name": month_names[month - 1],
                "revenue": 0.0
            })

        if payments_res.data:
            for payment in payments_res.data:
                try:
                    date_str = payment['payment_date'].replace('Z', '+00:00')
                    p_date = datetime.fromisoformat(date_str)
                    p_year = p_date.year
                    p_month = p_date.month

                    for m in last_6_months:
                        if m["year"] == p_year and m["month"] == p_month:
                            m["revenue"] += float(payment['amount'])
                except Exception:
                    pass

        revenue_by_month = [
            {"name": m["name"], "revenue": m["revenue"]} 
            for m in last_6_months
        ]

        # f) planDistribution
        members_plans_res = supabase_client.table('members').select('plan').eq('status', 'active').execute()
        plan_map = {
            '1_day': '1 Día',
            '15_days': '15 Días',
            '1_month': '1 Mes',
            '1_year': '1 Año'
        }
        plan_counts = {'1_day': 0, '15_days': 0, '1_month': 0, '1_year': 0}
        if members_plans_res.data:
            for m in members_plans_res.data:
                p = m.get('plan')
                if p in plan_counts:
                    plan_counts[p] += 1

        plan_distribution = [
            {"name": plan_map[k], "value": plan_counts[k]}
            for k in ['1_day', '15_days', '1_month', '1_year']
        ]

        # g) paymentMethodDistribution
        methods_res = supabase_client.table('payments').select('method').eq('status', 'confirmed').gte('payment_date', start_of_month).execute()
        method_map = {
            'cash': 'Efectivo',
            'nequi': 'Nequi',
            'daviplata': 'DaviPlata',
            'bold': 'Bold',
            'other': 'Otro'
        }
        method_counts = {'cash': 0, 'nequi': 0, 'daviplata': 0, 'bold': 0, 'other': 0}
        if methods_res.data:
            for p in methods_res.data:
                m = p.get('method')
                if m in method_counts:
                    method_counts[m] += 1

        payment_method_distribution = [
            {"name": method_map[k], "value": method_counts[k], "method": k}
            for k in ['cash', 'nequi', 'daviplata', 'bold', 'other']
        ]

        # h) recentPayments
        recent_res = supabase_client.table('payments').select('*, members(profiles:profile_id(full_name, email))').eq('status', 'confirmed').order('payment_date', desc=True).limit(5).execute()
        recent_payments = []
        if recent_res.data:
            for r in recent_res.data:
                member_data = r.get("members")
                profile_data = member_data.get("profiles") if member_data else None
                full_name = profile_data.get("full_name") if profile_data else "Miembro Registrado"
                email = profile_data.get("email") if profile_data else None

                recent_payments.append({
                    "id": r["id"],
                    "amount": float(r["amount"]),
                    "method": r["method"],
                    "payment_date": r["payment_date"],
                    "status": r["status"],
                    "members": {
                        "profiles": {
                            "full_name": full_name,
                            "email": email
                        }
                    }
                })

        # i) membersWithoutChip
        without_chip_res = supabase_client.table('members').select('*, profiles:profile_id(full_name, email)').eq('status', 'active').is_('card_no', 'null').execute()
        members_without_chip = []
        if without_chip_res.data:
            for r in without_chip_res.data:
                profile_data = r.get("profiles")
                members_without_chip.append({
                    "id": r["id"],
                    "profiles": {
                        "full_name": profile_data.get("full_name") if profile_data else "Sin nombre",
                        "email": profile_data.get("email") if profile_data else None
                    }
                })

        return {
            "totalActiveMembers": total_active_members,
            "monthlyRevenue": monthly_revenue,
            "expiringThisWeek": expiring_this_week,
            "newMembersThisMonth": new_members_this_month,
            "revenueByMonth": revenue_by_month,
            "planDistribution": plan_distribution,
            "paymentMethodDistribution": payment_method_distribution,
            "recentPayments": recent_payments,
            "membersWithoutChip": members_without_chip
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al calcular las métricas del dashboard: {str(e)}"
        )
