CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_quiz_id UUID,
    p_student_answers JSONB, -- e.g., '{"question_id_1": "option_id_A", "question_id_2": "option_id_C"}'
    p_time_taken_seconds INTEGER
)
RETURNS TABLE (
    final_score NUMERIC,
    base_score NUMERIC,
    bonus_points NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID := auth.uid();
    v_question RECORD;
    v_selected_option_id TEXT;
    v_is_correct BOOLEAN;
    v_base_score NUMERIC := 0;
    v_bonus_points NUMERIC := 0;
    v_final_score NUMERIC := 0;
    v_time_limit_seconds INTEGER;
    v_attempt_id UUID;
BEGIN
    -- Get quiz time limit
    SELECT time_limit_seconds INTO v_time_limit_seconds FROM public.quizzes WHERE id = p_quiz_id;

    -- Calculate base score
    FOR v_question IN
        SELECT id, correct_answer, points FROM public.questions WHERE quiz_id = p_quiz_id
    LOOP
        v_selected_option_id := p_student_answers ->> v_question.id::TEXT;
        v_is_correct := v_selected_option_id = v_question.correct_answer;

        IF v_is_correct THEN
            v_base_score := v_base_score + v_question.points;
        END IF;
    END LOOP;

    -- Calculate bonus points (20% of base score, scaled by time saved)
    IF v_time_limit_seconds IS NOT NULL AND v_time_limit_seconds > 0 AND p_time_taken_seconds < v_time_limit_seconds THEN
        v_bonus_points := (v_base_score * 0.2) * ( (v_time_limit_seconds - p_time_taken_seconds)::NUMERIC / v_time_limit_seconds );
    END IF;
    
    v_final_score := v_base_score + v_bonus_points;

    -- Insert into quiz_attempts
        INSERT INTO public.quiz_attempts (quiz_id, student_id, final_score, base_score, bonus_points, time_taken_seconds, completed_at, answers)
    VALUES (p_quiz_id, v_student_id, v_final_score, v_base_score, v_bonus_points, p_time_taken_seconds, NOW(), p_student_answers)
    RETURNING id INTO v_attempt_id;

    -- Update student's total points
    UPDATE public.students
    SET total_points = total_points + v_final_score
    WHERE user_id = v_student_id;

    RETURN QUERY SELECT v_final_score, v_base_score, v_bonus_points;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(UUID, JSONB, INTEGER) TO authenticated;
