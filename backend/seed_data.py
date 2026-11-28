import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.brand import Brand
from app.models.mechanic import Mechanic, MechanicBrandCommission
from app.models.supplier import Supplier
from app.models.spare_part import SparePart


async def seed():
    async with AsyncSessionLocal() as db:
        # 1. Seed Cashier1 user if missing
        res = await db.execute(select(User).where(User.username == "cashier1"))
        if not res.scalar_one_or_none():
            cashier = User(
                username="cashier1",
                email="cashier1@partshop.com",
                full_name="Ravi Kumar (Cashier)",
                password_hash=hash_password("Password123!"),
                role=UserRole.COUNTER_STAFF,
                is_active=True,
            )
            db.add(cashier)
            print("Seeded user: cashier1")

        # 2. Seed Default Brands
        default_brands = [
            ("Hero", "HERO", "Hero MotoCorp OEM & Genuine Spares"),
            ("Bajaj", "BAJ", "Bajaj Auto Genuine Spares"),
            ("Honda", "HON", "Honda Motorcycle & Scooter Genuine Parts"),
            ("TVS", "TVS", "TVS Motor Genuine Spare Parts"),
            ("Yamaha", "YAM", "Yamaha Motor Genuine Components"),
            ("Royal Enfield", "RE", "Royal Enfield Genuine Motorcycle Spares"),
            ("Bosch", "BOSCH", "Bosch Automotive Electrical & Brake Systems"),
            ("Endurance", "ENDUR", "Endurance Shock Absorbers & Brakes"),
            ("Castrol", "CAST", "Castrol High Performance Engine Lubricants"),
            ("Minda", "MINDA", "Uno Minda Electricals, Horns & Locks"),
        ]

        brand_map = {}
        for name, code, desc in default_brands:
            res = await db.execute(select(Brand).where(Brand.name == name))
            b = res.scalar_one_or_none()
            if not b:
                b = Brand(name=name, code=code, description=desc)
                db.add(b)
                await db.flush()
                print(f"Seeded brand: {name}")
            brand_map[name] = b

        # 3. Seed Default Mechanics with Brand Commission Matrix
        mechanics_data = [
            {
                "name": "Ramesh Sharma",
                "phone": "+91 98765 43210",
                "garage_name": "Ramesh Auto Care",
                "address": "Shop 4, Main Market, Station Road",
                "default_pct": Decimal("5.00"),
                "commissions": [
                    ("Hero", Decimal("8.00")),
                    ("Bajaj", Decimal("10.00")),
                    ("Endurance", Decimal("12.00")),
                ],
            },
            {
                "name": "Suresh Patil",
                "phone": "+91 98765 43211",
                "garage_name": "Suresh Two Wheeler Works",
                "address": "Plot 12, Industrial Area, Bypass",
                "default_pct": Decimal("6.00"),
                "commissions": [
                    ("Honda", Decimal("9.00")),
                    ("Bosch", Decimal("11.00")),
                    ("Castrol", Decimal("10.00")),
                ],
            },
            {
                "name": "Anand Verma",
                "phone": "+91 98765 43212",
                "garage_name": "Anand Bike Point",
                "address": "Near Old Bus Stand",
                "default_pct": Decimal("5.00"),
                "commissions": [
                    ("TVS", Decimal("8.50")),
                    ("Minda", Decimal("10.00")),
                    ("Hero", Decimal("7.50")),
                ],
            },
        ]

        for m_data in mechanics_data:
            res = await db.execute(select(Mechanic).where(Mechanic.phone == m_data["phone"]))
            mech = res.scalar_one_or_none()
            if not mech:
                mech = Mechanic(
                    name=m_data["name"],
                    phone=m_data["phone"],
                    garage_name=m_data["garage_name"],
                    address=m_data["address"],
                    default_commission_percentage=m_data["default_pct"],
                    is_active=True,
                )
                db.add(mech)
                await db.flush()

                for brand_name, pct in m_data["commissions"]:
                    if brand_name in brand_map:
                        comm = MechanicBrandCommission(
                            mechanic_id=mech.id,
                            brand_id=brand_map[brand_name].id,
                            commission_percentage=pct,
                        )
                        db.add(comm)
                print(f"Seeded mechanic: {m_data['name']} ({m_data['garage_name']})")

        # 4. Seed Wholesaler Suppliers
        suppliers_data = [
            {
                "name": "Kalyani Honda Spares Distributorship",
                "contact_person": "Rajesh Kalyani",
                "phone": "+91 94370 12345",
                "email": "orders@kalyanihonda.com",
                "address": "Plot 45, Auto Nagar, Cuttack Road",
                "gst_number": "21AAECK1234F1Z5",
                "default_discount_percentage": Decimal("14.50"),
                "brands": ["Honda"],
            },
            {
                "name": "Om Sai Auto Spares Wholesaler",
                "contact_person": "Mahesh Agarwal",
                "phone": "+91 94371 67890",
                "email": "sales@omsaiauto.in",
                "address": "G-12, Transport Nagar, Ring Road",
                "gst_number": "21BBCOA5678G2Z1",
                "default_discount_percentage": Decimal("18.00"),
                "brands": ["Bajaj", "Endurance"],
            },
            {
                "name": "National Hero Genuine Spares",
                "contact_person": "Sunil Patnaik",
                "phone": "+91 94372 99887",
                "email": "patnaik.hero@gmail.com",
                "address": "Station Square, Near Railway Overbridge",
                "gst_number": "21CCPHP9988H1ZA",
                "default_discount_percentage": Decimal("15.00"),
                "brands": ["Hero"],
            },
        ]

        supplier_map: dict[str, Supplier] = {}
        for s_data in suppliers_data:
            res = await db.execute(select(Supplier).where(Supplier.name == s_data["name"]))
            supp = res.scalar_one_or_none()
            if not supp:
                supp = Supplier(
                    name=s_data["name"],
                    contact_person=s_data["contact_person"],
                    phone=s_data["phone"],
                    email=s_data["email"],
                    address=s_data["address"],
                    gst_number=s_data["gst_number"],
                    default_discount_percentage=s_data["default_discount_percentage"],
                    is_active=True,
                )
                db.add(supp)
                await db.flush()
                print(f"Seeded supplier: {s_data['name']}")
            supplier_map[s_data["name"]] = supp

        # 5. Map Existing Spare Parts to Seeded Suppliers if not yet mapped
        all_parts_res = await db.execute(select(SparePart).where(SparePart.supplier_id.is_(None)))
        unmapped_parts = list(all_parts_res.scalars().all())
        mapped_count = 0

        honda_supp = supplier_map.get("Kalyani Honda Spares Distributorship")
        bajaj_supp = supplier_map.get("Om Sai Auto Spares Wholesaler")
        hero_supp = supplier_map.get("National Hero Genuine Spares")

        for p in unmapped_parts:
            b_name = (p.brand_name or "").lower()
            compat = (p.compatible_bikes or "").lower()

            if "honda" in b_name or "honda" in compat or "activa" in compat or "dio" in compat:
                if honda_supp:
                    p.supplier_id = honda_supp.id
                    p.supplier_name = honda_supp.name
                    p.supplier_discount = honda_supp.default_discount_percentage
                    mapped_count += 1
            elif "bajaj" in b_name or "bajaj" in compat or "pulsar" in compat:
                if bajaj_supp:
                    p.supplier_id = bajaj_supp.id
                    p.supplier_name = bajaj_supp.name
                    p.supplier_discount = bajaj_supp.default_discount_percentage
                    mapped_count += 1
            elif "hero" in b_name or "hero" in compat or "splendor" in compat:
                if hero_supp:
                    p.supplier_id = hero_supp.id
                    p.supplier_name = hero_supp.name
                    p.supplier_discount = hero_supp.default_discount_percentage
                    mapped_count += 1

        if mapped_count > 0:
            print(f"Mapped {mapped_count} spare parts to suppliers with supplier discount percentages.")

        await db.commit()
        print("Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
