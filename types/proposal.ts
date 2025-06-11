export interface Phase {
    phase: string;
    tasks?: string[];
  }
  
  export interface Cost {
    phase: string;
    cost: string | number;
  }
  
  export interface Proposal {
    customer_name?: string;
    customer_email?: string;
    company_name?: string;
    total_net_amount?: string | number;
    vat_amount?: string | number;
    total_gross_amount?: string | number;
    final_deadline?: string;
    timeline_and_scheduling_details?: string | string[];
    relevant_implementation_notes_or_recommendations?: string | string[];
    assumptions_made?: string | string[];
    requirements?: string[];
    client_priorities?: string[];
    must_haves?: string[];
    nice_to_haves?: string[];
    constraints?: string[];
    risks_or_dependencies?: string[];
    missing_info?: string[];
    main_work_phases_and_tasks?: Phase[];
    estimated_costs_per_phase_and_total?: Cost[];
    project_type?: string;
    scope?: string;
    property_type?: string;
    location?: string;
    area_sqm?: string | number;
    rooms_affected?: string[];
    budget_estimate?: string | number;
    timeline?: string;
    phasing?: string;
    summary_comment?: string;
    [key: string]: unknown;
  }
  